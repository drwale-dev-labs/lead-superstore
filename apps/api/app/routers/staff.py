from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import get_supabase
from app.schemas.staff import StaffCreate, StaffUpdate

router = APIRouter()


@router.get("/")
def list_staff(
    outlet_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
):
    """List staff with optional filters."""
    supabase = get_supabase()
    query = supabase.table("staff").select("*, outlets(name), roles(name, unit)")

    if outlet_id:
        query = query.eq("outlet_id", str(outlet_id))
    if status_filter:
        query = query.eq("status", status_filter)
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


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_staff(payload: StaffCreate):
    """Onboard a new staff member."""
    supabase = get_supabase()
    insert_data = payload.model_dump(mode="json", exclude_none=True)
    response = supabase.table("staff").insert(insert_data).execute()
    return response.data[0]


@router.patch("/{staff_id}")
def update_staff(staff_id: UUID, payload: StaffUpdate):
    """Update a staff member. Only provided fields are changed."""
    supabase = get_supabase()
    update_data = payload.model_dump(mode="json", exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = (
        supabase.table("staff")
        .update(update_data)
        .eq("id", str(staff_id))
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return response.data[0]


@router.post("/{staff_id}/activate")
def activate_staff(staff_id: UUID):
    """Promote staff from onboarding to active."""
    supabase = get_supabase()
    response = (
        supabase.table("staff")
        .update({"status": "active"})
        .eq("id", str(staff_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return response.data[0]


@router.delete("/{staff_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_staff(staff_id: UUID):
    """Soft-delete by setting status='terminated'. Hard delete is not allowed."""
    supabase = get_supabase()
    response = (
        supabase.table("staff")
        .update({"status": "terminated", "terminated_at": "now()"})
        .eq("id", str(staff_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    return None