from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import get_supabase
from app.schemas.deductions import (
    AdvanceCreate,
    AdvanceUpdate,
    FineCreate,
    FineUpdate,
    LoanCreate,
    LoanUpdate,
)

router = APIRouter()


def _validate_staff(supabase, staff_id: UUID) -> None:
    check = supabase.table("staff").select("id").eq("id", str(staff_id)).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Staff member not found")


# ============================================================================
# Loans
# ============================================================================


@router.get("/loans")
def list_loans(
    staff_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
):
    supabase = get_supabase()
    query = supabase.table("loans").select("*, staff(first_name, last_name)")
    if staff_id:
        query = query.eq("staff_id", str(staff_id))
    if status_filter:
        query = query.eq("status", status_filter)
    response = query.order("created_at", desc=True).execute()
    return {"count": len(response.data), "loans": response.data}


@router.post("/loans", status_code=status.HTTP_201_CREATED)
def create_loan(payload: LoanCreate):
    """Create a loan. Balance starts equal to principal."""
    supabase = get_supabase()
    _validate_staff(supabase, payload.staff_id)

    if payload.monthly_installment > payload.principal:
        raise HTTPException(status_code=400, detail="Monthly installment cannot exceed principal")

    insert = payload.model_dump(mode="json")
    insert["balance"] = float(payload.principal)
    insert["approved_at"] = datetime.now(timezone.utc).isoformat()  # auto-approved on creation

    response = supabase.table("loans").insert(insert).execute()
    return response.data[0]


@router.patch("/loans/{loan_id}")
def update_loan(loan_id: UUID, payload: LoanUpdate):
    supabase = get_supabase()
    update = payload.model_dump(mode="json", exclude_none=True)
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = supabase.table("loans").update(update).eq("id", str(loan_id)).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Loan not found")
    return response.data[0]


# ============================================================================
# Salary advances
# ============================================================================


@router.get("/advances")
def list_advances(
    staff_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
):
    supabase = get_supabase()
    query = supabase.table("salary_advances").select("*, staff(first_name, last_name)")
    if staff_id:
        query = query.eq("staff_id", str(staff_id))
    if status_filter:
        query = query.eq("status", status_filter)
    response = query.order("created_at", desc=True).execute()
    return {"count": len(response.data), "advances": response.data}


@router.post("/advances", status_code=status.HTTP_201_CREATED)
def create_advance(payload: AdvanceCreate):
    """Create a salary advance. Auto-approved on creation; will be deducted next payroll."""
    supabase = get_supabase()
    _validate_staff(supabase, payload.staff_id)

    insert = payload.model_dump(mode="json")
    insert["approved_at"] = datetime.now(timezone.utc).isoformat()

    response = supabase.table("salary_advances").insert(insert).execute()
    return response.data[0]


@router.patch("/advances/{advance_id}")
def update_advance(advance_id: UUID, payload: AdvanceUpdate):
    supabase = get_supabase()
    update = payload.model_dump(mode="json", exclude_none=True)
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    existing = (
        supabase.table("salary_advances").select("status").eq("id", str(advance_id)).execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Advance not found")
    if existing.data[0]["status"] == "applied":
        raise HTTPException(status_code=400, detail="Cannot edit an already-applied advance")

    response = (
        supabase.table("salary_advances").update(update).eq("id", str(advance_id)).execute()
    )
    return response.data[0]


# ============================================================================
# Fines / penalties
# ============================================================================


@router.get("/fines")
def list_fines(
    staff_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
):
    supabase = get_supabase()
    query = supabase.table("fines").select("*, staff(first_name, last_name)")
    if staff_id:
        query = query.eq("staff_id", str(staff_id))
    if status_filter:
        query = query.eq("status", status_filter)
    response = query.order("created_at", desc=True).execute()
    return {"count": len(response.data), "fines": response.data}


@router.post("/fines", status_code=status.HTTP_201_CREATED)
def create_fine(payload: FineCreate):
    """Create a fine. Starts in 'pending' status — must be approved before it deducts."""
    supabase = get_supabase()
    _validate_staff(supabase, payload.staff_id)

    insert = payload.model_dump(mode="json")
    response = supabase.table("fines").insert(insert).execute()
    return response.data[0]


@router.post("/fines/{fine_id}/approve")
def approve_fine(fine_id: UUID):
    """Approve a fine so it gets included in the next payroll generation."""
    supabase = get_supabase()

    existing = supabase.table("fines").select("status").eq("id", str(fine_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Fine not found")
    if existing.data[0]["status"] != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve fine in status '{existing.data[0]['status']}'",
        )

    response = (
        supabase.table("fines")
        .update(
            {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}
        )
        .eq("id", str(fine_id))
        .execute()
    )
    return response.data[0]


@router.patch("/fines/{fine_id}")
def update_fine(fine_id: UUID, payload: FineUpdate):
    supabase = get_supabase()

    existing = supabase.table("fines").select("status").eq("id", str(fine_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Fine not found")
    if existing.data[0]["status"] == "applied":
        raise HTTPException(status_code=400, detail="Cannot edit an already-applied fine")

    update = payload.model_dump(mode="json", exclude_none=True)
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")

    response = supabase.table("fines").update(update).eq("id", str(fine_id)).execute()
    return response.data[0]