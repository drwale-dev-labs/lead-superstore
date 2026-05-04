from fastapi import APIRouter, HTTPException, Query
from uuid import UUID

from app.core.db import get_supabase

router = APIRouter()


@router.get("/")
def list_applications(
    job_posting_id: UUID | None = Query(None),
    status: str | None = Query(None, description="new, reviewing, shortlisted, interviewed, rejected, hired"),
):
    """List applications (HR inbox)."""
    supabase = get_supabase()
    query = supabase.table("applications").select(
        "*, job_postings(title, outlet_id, outlets(name))"
    )

    if job_posting_id:
        query = query.eq("job_posting_id", str(job_posting_id))
    if status:
        query = query.eq("status", status)

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