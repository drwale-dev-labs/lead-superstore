from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import get_supabase
from app.schemas.staff import StaffCreate, StaffUpdate
from app.services import training_bond

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
    """Onboard a new staff member.

    Also opens their first staff_assignments row, so the assignment
    history has a starting point to show "moved from" against on their
    first transfer — without this, a first-ever transfer has no prior
    row to compare against.
    """
    supabase = get_supabase()
    insert_data = payload.model_dump(mode="json", exclude_none=True)
    response = supabase.table("staff").insert(insert_data).execute()
    staff = response.data[0]

    supabase.table("staff_assignments").insert(
        {
            "staff_id": staff["id"],
            "outlet_id": staff["outlet_id"],
            "role_id": staff["role_id"],
            "started_at": staff["hired_at"],
            "transfer_reason": "Initial hire",
            "is_approved": True,
            "is_imported": False,
        }
    ).execute()

    return staff


@router.patch("/{staff_id}")
def update_staff(staff_id: UUID, payload: StaffUpdate):
    """Update a staff member. Only provided fields are changed.

    If hired_at changes, downstream data that was computed from the old date
    goes stale: the earliest staff_assignments row's started_at, training
    bond eligibility, and working_days/deductions on any not-yet-approved
    payroll entry. These are corrected automatically here rather than left
    for someone to notice and fix by hand later.
    """
    supabase = get_supabase()
    update_data = payload.model_dump(mode="json", exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    existing = (
        supabase.table("staff")
        .select("hired_at")
        .eq("id", str(staff_id))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    old_hired_at = existing.data[0]["hired_at"]

    response = (
        supabase.table("staff")
        .update(update_data)
        .eq("id", str(staff_id))
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    staff = response.data[0]
    adjustments: list[str] = []
    new_hired_at = update_data.get("hired_at")
    if new_hired_at and new_hired_at != old_hired_at:
        adjustments = _fix_stale_data_after_hire_date_change(
            supabase, staff_id, new_hired_at
        )

    return {**staff, "adjustments": adjustments}


def _fix_stale_data_after_hire_date_change(
    supabase, staff_id: UUID, new_hired_at: str
) -> list[str]:
    """Correct data that was derived from a staff member's old hired_at.

    Returns a list of human-readable notes about what was adjusted, so the
    caller can surface it without blocking the save.
    """
    from app.routers.payroll import _refresh_period_totals
    from app.services import payroll as payroll_service

    notes: list[str] = []
    new_hired_date = date.fromisoformat(new_hired_at)

    # 1. Earliest assignment row — the "Initial hire" entry's started_at.
    earliest = (
        supabase.table("staff_assignments")
        .select("id, started_at, transfer_reason")
        .eq("staff_id", str(staff_id))
        .order("started_at")
        .limit(1)
        .execute()
    )
    if earliest.data and earliest.data[0]["started_at"] != new_hired_at:
        supabase.table("staff_assignments").update(
            {"started_at": new_hired_at}
        ).eq("id", earliest.data[0]["id"]).execute()
        notes.append("Updated initial assignment date to match the new hire date.")

    # 2. Training bond eligibility — delete an existing bond that's now
    # ineligible, as long as nothing has actually been paid out on it yet
    # (payroll approval is the only thing that commits bond totals).
    bond = (
        supabase.table("training_bonds")
        .select("id, total_deducted, total_paid_back")
        .eq("staff_id", str(staff_id))
        .execute()
    )
    if bond.data:
        b = bond.data[0]
        if not training_bond.is_eligible_for_bond(new_hired_date):
            if b["total_deducted"] == 0 and b["total_paid_back"] == 0:
                supabase.table("training_bonds").delete().eq("id", b["id"]).execute()
                notes.append(
                    "Removed training bond — no longer eligible under the corrected hire date."
                )
            else:
                notes.append(
                    "Hire date no longer qualifies for a training bond, but it has "
                    "existing deductions/paybacks — left as-is for manual review."
                )

    # 3. Draft payroll entries — working_days/deductions were computed from
    # the old hired_at. Only draft (unapproved) periods are safe to touch;
    # approved periods already committed real money and must stay put.
    draft_entries = (
        supabase.table("payroll_entries")
        .select(
            "id, period_id, gross_salary, deductions, adjustment_amount, "
            "payroll_periods!inner(status, period_start, period_end)"
        )
        .eq("staff_id", str(staff_id))
        .eq("payroll_periods.status", "draft")
        .execute()
    )
    for entry in draft_entries.data:
        period = entry["payroll_periods"]
        period_start = date.fromisoformat(period["period_start"])
        period_end = date.fromisoformat(period["period_end"])
        new_working_days = payroll_service.calendar_days_worked_in_period(
            period_start, period_end, new_hired_date, None
        )
        new_net = payroll_service.compute_net_salary(
            gross_salary=Decimal(str(entry["gross_salary"])),
            working_days=new_working_days,
            deductions=Decimal(str(entry["deductions"])),
        )
        new_net += Decimal(str(entry.get("adjustment_amount") or 0))
        supabase.table("payroll_entries").update(
            {"working_days": new_working_days, "net_pay": float(new_net)}
        ).eq("id", entry["id"]).execute()
        _refresh_period_totals(supabase, entry["period_id"])
        notes.append(
            f"Recomputed working days ({new_working_days}/30) and net pay on a draft payroll entry."
        )

    return notes


@router.post("/{staff_id}/activate")
def activate_staff(staff_id: UUID):
    """Promote staff from onboarding to active.

    Hard gate: requires at least 1 reference AND 1 guarantor on file.
    Returns 400 with a clear message listing what's missing if not met.
    """
    supabase = get_supabase()

    # Verify staff exists
    staff = (
        supabase.table("staff")
        .select("id, status")
        .eq("id", str(staff_id))
        .execute()
    )
    if not staff.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    # Check verification requirements
    refs = (
        supabase.table("staff_references")
        .select("id")
        .eq("staff_id", str(staff_id))
        .limit(1)
        .execute()
    )
    guars = (
        supabase.table("staff_guarantors")
        .select("id")
        .eq("staff_id", str(staff_id))
        .limit(1)
        .execute()
    )

    missing: list[str] = []
    if not refs.data:
        missing.append("at least 1 reference")
    if not guars.data:
        missing.append("a guarantor")

    if missing:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Cannot activate — verification incomplete. "
                f"Missing: {', '.join(missing)}."
            ),
        )

    # Activate, stamp verification metadata
    from datetime import datetime, timezone
    response = (
        supabase.table("staff")
        .update(
            {
                "status": "active",
                "verified_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(staff_id))
        .execute()
    )

    return response.data[0]


@router.post("/{staff_id}/activate-existing")
def activate_existing_staff(staff_id: UUID):
    """Activate an already-employed staff member onboarded via the 'existing
    staff' wizard path — no reference/guarantor requirement.

    This is intentionally a separate route from /activate, not a bypass flag
    on it, so the new-hire verification gate stays untouched. Only use this
    for staff genuinely known/trusted and already working at Lead Superstore
    (see BUGFIX_RUNBOOK.md Phase 6) — never as a shortcut for new external
    hires.
    """
    supabase = get_supabase()

    staff = (
        supabase.table("staff").select("id, status").eq("id", str(staff_id)).execute()
    )
    if not staff.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    response = (
        supabase.table("staff")
        .update(
            {
                "status": "active",
                "verified_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(staff_id))
        .execute()
    )

    return response.data[0]


@router.delete("/{staff_id}", status_code=status.HTTP_200_OK)
def delete_staff(
    staff_id: UUID,
    reason: str = Query(..., pattern="^(resigned|sacked|absconded|other)$"),
    note: str | None = Query(None),
    terminated_at: date | None = Query(
        None,
        description="The date they actually left. Defaults to today if not given — "
        "use this when recording a termination after the fact (e.g. they left "
        "days ago and HR is only entering it now).",
    ),
):
    """Soft-delete by setting status='terminated'. Hard delete is not allowed.

    If the staff member has an active training bond, this forfeits it (if
    they left within the first 6 months) or flags the outstanding payback
    balance for manual HR review (if they left during months 7-12) — the
    balance is never auto-paid out. Both checks use the actual departure
    date, not when this action happens to be recorded.
    """
    supabase = get_supabase()
    effective_date = terminated_at or datetime.now(timezone.utc).date()
    update_data = {
        "status": "terminated",
        "terminated_at": effective_date.isoformat(),
        "termination_reason": reason,
        "termination_note": note,
    }
    response = (
        supabase.table("staff")
        .update(update_data)
        .eq("id", str(staff_id))
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    bond_result = training_bond.check_bond_on_termination(
        supabase, staff_id, effective_date
    )

    return {"staff": response.data[0], "training_bond": bond_result}