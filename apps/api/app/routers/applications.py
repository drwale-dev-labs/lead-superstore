from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import get_supabase
from app.schemas.job import ApplicationCreate, ApplicationUpdate

router = APIRouter()


@router.get("/")
def list_applications(
    job_posting_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
):
    """List applications (HR inbox)."""
    supabase = get_supabase()
    query = supabase.table("applications").select(
        "*, job_postings(title, outlet_id, outlets(name))"
    )

    if job_posting_id:
        query = query.eq("job_posting_id", str(job_posting_id))
    if status_filter:
        query = query.eq("status", status_filter)

    response = query.order("applied_at", desc=True).execute()
    return {"count": len(response.data), "applications": response.data}


@router.get("/{application_id}")
def get_application(application_id: UUID):
    """Get a single application."""
    supabase = get_supabase()
    response = (
        supabase.table("applications")
        .select("*, job_postings(title, outlets(name))")
        .eq("id", str(application_id))
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Application not found")

    return response.data


@router.post("/", status_code=status.HTTP_201_CREATED)
def submit_application(payload: ApplicationCreate):
    """Submit an application. Public endpoint — used by the careers page."""
    supabase = get_supabase()

    # Verify the job posting exists and is currently published
    job = (
        supabase.table("job_postings")
        .select("id, status, title")
        .eq("id", str(payload.job_posting_id))
        .execute()
    )
    if not job.data:
        raise HTTPException(status_code=404, detail="Job posting not found")
    if job.data[0]["status"] != "published":
        raise HTTPException(
            status_code=400,
            detail="This job is not currently accepting applications",
        )

    # Prevent duplicate applications from the same email for the same job
    duplicate = (
        supabase.table("applications")
        .select("id")
        .eq("job_posting_id", str(payload.job_posting_id))
        .eq("email", payload.email)
        .execute()
    )
    if duplicate.data:
        raise HTTPException(
            status_code=409,
            detail="You have already applied for this position",
        )

    insert_data = payload.model_dump(mode="json", exclude_none=True)
    response = supabase.table("applications").insert(insert_data).execute()

    if not response.data:
        raise HTTPException(status_code=500, detail="Failed to submit application")

    return response.data[0]


@router.patch("/{application_id}")
def update_application(application_id: UUID, payload: ApplicationUpdate):
    """HR endpoint — move application through the hiring pipeline."""
    supabase = get_supabase()

    update_data = payload.model_dump(mode="json", exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = (
        supabase.table("applications")
        .update(update_data)
        .eq("id", str(application_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Application not found")

    return response.data[0]