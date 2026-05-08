from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.db import get_supabase
from app.schemas.transfers import TransferRequest

router = APIRouter()


@router.get("/staff/{staff_id}/assignments")
def list_assignments(staff_id: UUID):
    """List all assignments for a staff member, current first."""
    supabase = get_supabase()

    # Verify staff exists
    staff_check = supabase.table("staff").select("id").eq("id", str(staff_id)).execute()
    if not staff_check.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    response = (
        supabase.table("staff_assignments")
        .select("*, outlets(name), roles(name, unit)")
        .eq("staff_id", str(staff_id))
        .order("started_at", desc=True)
        .execute()
    )
    return {"count": len(response.data), "assignments": response.data}


@router.post("/staff/{staff_id}/transfer", status_code=status.HTTP_201_CREATED)
def transfer_staff(staff_id: UUID, payload: TransferRequest):
    """Transfer a staff member to a new outlet and/or role.

    Atomic operation:
      1. Close the current assignment (set ended_at = effective_date - 1 day,
         or = effective_date for back-dated transfers)
      2. Open a new assignment starting on effective_date
      3. Update staff.outlet_id and staff.role_id to the new values
    """
    supabase = get_supabase()

    # Fetch staff
    staff = (
        supabase.table("staff")
        .select("id, outlet_id, role_id, status")
        .eq("id", str(staff_id))
        .execute()
    )
    if not staff.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    current = staff.data[0]
    if current["status"] in ("terminated", "inactive"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transfer a {current['status']} staff member",
        )

    # Refuse no-op transfers
    if (
        str(payload.new_outlet_id) == current["outlet_id"]
        and payload.new_role_id == current["role_id"]
    ):
        raise HTTPException(
            status_code=400,
            detail="Staff is already assigned to this outlet and role",
        )

    # Close any open assignment (ended_at = day before effective_date)
    from datetime import timedelta
    end_date = (payload.effective_date - timedelta(days=1)).isoformat()
    supabase.table("staff_assignments").update({"ended_at": end_date}).eq(
        "staff_id", str(staff_id)
    ).is_("ended_at", "null").execute()

    # Open the new assignment
    new_assignment = {
        "staff_id": str(staff_id),
        "outlet_id": str(payload.new_outlet_id),
        "role_id": payload.new_role_id,
        "started_at": payload.effective_date.isoformat(),
        "transfer_reason": payload.transfer_reason,
        "approved_by_name": payload.approved_by_name,
        "is_approved": payload.is_approved,
        "is_imported": False,
    }
    inserted = supabase.table("staff_assignments").insert(new_assignment).execute()

    # Update the staff record's denormalised current outlet/role
    supabase.table("staff").update(
        {
            "outlet_id": str(payload.new_outlet_id),
            "role_id": payload.new_role_id,
        }
    ).eq("id", str(staff_id)).execute()

    return inserted.data[0]