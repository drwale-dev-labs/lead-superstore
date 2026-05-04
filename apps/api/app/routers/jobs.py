from fastapi import APIRouter, HTTPException, Query
from uuid import UUID

from app.core.db import get_supabase

router = APIRouter()


@router.get("/")
def list_job_postings(
    status: str | None = Query(None, description="draft, published, closed"),
    outlet_id: UUID | None = Query(None),
):
    """List job postings (admin view)."""
    supabase = get_supabase()
    query = supabase.table("job_postings").select("*, outlets(name), roles(name, unit)")

    if status:
        query = query.eq("status", status)
    if outlet_id:
        query = query.eq("outlet_id", str(outlet_id))

    response = query.order("created_at", desc=True).execute()
    return {"count": len(response.data), "jobs": response.data}


@router.get("/public")
def list_public_jobs():
    """Public-facing endpoint — only published jobs. Used by the careers page."""
    supabase = get_supabase()
    response = (
        supabase.table("job_postings")
        .select("id, title, description, requirements, employment_type, published_at, closes_at, outlets(name, city)")
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