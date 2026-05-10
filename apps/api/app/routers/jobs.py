from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import get_supabase
from app.schemas.job import JobPostingCreate, JobPostingUpdate

# ============================================================================
# HR-only router — full lifecycle management
# ============================================================================

admin_router = APIRouter()


@admin_router.get("/")
def list_job_postings(
    status_filter: str | None = Query(None, alias="status"),
    outlet_id: UUID | None = Query(None),
):
    """List all job postings (HR view, includes drafts and closed)."""
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


@admin_router.get("/{job_id}")
def get_job(job_id: UUID):
    """Get a single job posting (HR view, any status)."""
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


@admin_router.post("/", status_code=status.HTTP_201_CREATED)
def create_job(payload: JobPostingCreate):
    """Create a job posting in 'draft' status."""
    supabase = get_supabase()
    insert_data = payload.model_dump(mode="json", exclude_none=True)
    response = supabase.table("job_postings").insert(insert_data).execute()
    return response.data[0]


@admin_router.patch("/{job_id}")
def update_job(job_id: UUID, payload: JobPostingUpdate):
    """Update a job posting. Closed jobs cannot be edited."""
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


@admin_router.post("/{job_id}/publish")
def publish_job(job_id: UUID):
    """Move a job from draft to published."""
    supabase = get_supabase()

    existing = (
        supabase.table("job_postings").select("status").eq("id", str(job_id)).execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    current = existing.data[0]["status"]
    if current == "published":
        raise HTTPException(status_code=400, detail="Job is already published")
    if current == "closed":
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


@admin_router.post("/{job_id}/close")
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


# ============================================================================
# Public router — only published jobs, used by the e-commerce careers page
# ============================================================================

public_router = APIRouter()


@public_router.get("/public")
def list_public_jobs():
    """List all currently-published jobs."""
    supabase = get_supabase()
    response = (
        supabase.table("job_postings")
        .select(
            "id, title, description, requirements, employment_type, "
            "published_at, closes_at, role_id, "
            "outlets(name, city), roles(name, unit)"
        )
        .eq("status", "published")
        .order("published_at", desc=True)
        .execute()
    )
    return {"count": len(response.data), "jobs": response.data}


@public_router.get("/public/{job_id}")
def get_public_job(job_id: UUID):
    """Get a single published job. Used by the public job-detail page."""
    supabase = get_supabase()
    response = (
        supabase.table("job_postings")
        .select(
            "id, title, description, requirements, employment_type, "
            "published_at, closes_at, role_id, "
            "outlets(name, city), roles(name, unit, description)"
        )
        .eq("id", str(job_id))
        .eq("status", "published")
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=404,
            detail="Job posting not found or no longer accepting applications",
        )

    return response.data