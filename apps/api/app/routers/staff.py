from fastapi import APIRouter, HTTPException, Query
from uuid import UUID

from app.core.db import get_supabase

router = APIRouter()


@router.get("/")
def list_staff(
    outlet_id: UUID | None = Query(None),
    status: str | None = Query(None, description="active, onboarding, inactive, terminated"),
    search: str | None = Query(None, description="Match against first_name, last_name"),
):
    """List staff with optional filters."""
    supabase = get_supabase()
    query = supabase.table("staff").select("*, outlets(name), roles(name, unit)")

    if outlet_id:
        query = query.eq("outlet_id", str(outlet_id))
    if status:
        query = query.eq("status", status)
    if search:
        query = query.or_(f"first_name.ilike.%{search}%,last_name.ilike.%{search}%")

    response = query.order("created_at", desc=True).execute()
    return {"count": len(response.data), "staff": response.data}


@router.get("/{staff_id}")
def get_staff(staff_id: UUID):
    """Get a single staff member."""
    supabase = get_supabase()
    response = (
        supabase.table("staff")
        .select("*, outlets(name), roles(name, unit, description)")
        .eq("id", str(staff_id))
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return response.data