from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import get_supabase
from app.schemas.job import JobPostingCreate, JobPostingUpdate

router = APIRouter()


@router.get("/")
def list_job_postings(
    status_filter: str | None = Query(None, alias="status"),
    outlet_id: UUID | None = Query(None),
):
    """List all job postings (HR view, includes drafts)."""
    supabase = get_supabase()
    query = supabase.table("job_postings").select(
        "*, outlets(name, city), roles(name, unit)"
    )

    if status_filter:
        query = query.eq("status", status_filter)
    if outlet_id:
        query = query.eq("outlet_id", str(outlet_id))

    response = query.order("created_at", desc=True).execute()
    return {"count": len(response.data), "jobs": response.data}


@router.get("/public")
def list_public_jobs():
    """Public endpoint — only published jobs, used by the careers page."""
    supabase = get_supabase()
    response = (
        supabase.table("job_postings")
        .select(
            "id, title, description, requirements, employment_type, "
            "published_at, closes_at, outlets(name, city), roles(name, unit)"
        )
        .eq("status", "published")
        .order("published_at", desc=True)
        .execute()
    )
    return {"count": len(response.data), "jobs": response.data}


@router.get("/{job_id}")
def get_job(job_id: UUID):
    """Get a single job posting."""
    supabase = get_supabase()
    response = (
        supabase.table("job_postings")
        .select("*, outlets(name, city), roles(name, unit, description)")
        .eq("id", str(job_id))
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Job posting not found")

    return response.data


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_job(payload: JobPostingCreate):
    """Create a job posting in 'draft' status."""
    supabase = get_supabase()

    # Validate FK references
    outlet_check = (
        supabase.table("outlets").select("id").eq("id", str(payload.outlet_id)).execute()
    )
    if not outlet_check.data:
        raise HTTPException(status_code=400, detail=f"Outlet {payload.outlet_id} not found")

    role_check = supabase.table("roles").select("id").eq("id", payload.role_id).execute()
    if not role_check.data:
        raise HTTPException(status_code=400, detail=f"Role '{payload.role_id}' not found")

    insert_data = payload.model_dump(mode="json", exclude_none=True)
    response = supabase.table("job_postings").insert(insert_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to create job posting")

    return response.data[0]


@router.patch("/{job_id}")
def update_job(job_id: UUID, payload: JobPostingUpdate):
    """Update a job posting (only allowed for drafts and published jobs, not closed)."""
    supabase = get_supabase()

    existing = (
        supabase.table("job_postings").select("status").eq("id", str(job_id)).execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if existing.data[0]["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot edit a closed job posting")

    update_data = payload.model_dump(mode="json", exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = (
        supabase.table("job_postings")
        .update(update_data)
        .eq("id", str(job_id))
        .execute()
    )

    return response.data[0]


@router.post("/{job_id}/publish")
def publish_job(job_id: UUID):
    """Move a job from draft to published. Sets published_at to now."""
    supabase = get_supabase()

    existing = (
        supabase.table("job_postings").select("status").eq("id", str(job_id)).execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if existing.data[0]["status"] == "published":
        raise HTTPException(status_code=400, detail="Job is already published")
    if existing.data[0]["status"] == "closed":
        raise HTTPException(status_code=400, detail="Cannot publish a closed job")

    response = (
        supabase.table("job_postings")
        .update(
            {
                "status": "published",
                "published_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(job_id))
        .execute()
    )

    return response.data[0]


@router.post("/{job_id}/close")
def close_job(job_id: UUID):
    """Close a job posting. New applications can no longer be submitted."""
    supabase = get_supabase()

    existing = (
        supabase.table("job_postings").select("status").eq("id", str(job_id)).execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if existing.data[0]["status"] == "closed":
        raise HTTPException(status_code=400, detail="Job is already closed")

    response = (
        supabase.table("job_postings")
        .update({"status": "closed"})
        .eq("id", str(job_id))
        .execute()
    )

    return response.data[0]