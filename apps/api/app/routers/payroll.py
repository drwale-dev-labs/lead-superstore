from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import get_supabase
from app.schemas.payroll import (
    PayrollEntryUpdate,
    PayrollPeriodCreate,
    SalaryStructureCreate,
)
from app.services.payroll import compute_net_salary

router = APIRouter()


# ============================================================================
# Salary structures
# ============================================================================


@router.get("/salary-structures")
def list_salary_structures(staff_id: UUID | None = Query(None)):
    supabase = get_supabase()
    query = supabase.table("salary_structures").select("*, staff(first_name, last_name)")
    if staff_id:
        query = query.eq("staff_id", str(staff_id))
    response = query.order("effective_from", desc=True).execute()
    return {"count": len(response.data), "salary_structures": response.data}


@router.post("/salary-structures", status_code=status.HTTP_201_CREATED)
def create_salary_structure(payload: SalaryStructureCreate):
    """Set a new gross salary for a staff member.

    Closes any open structure by setting its effective_to to the day before
    this new one starts.
    """
    supabase = get_supabase()

    staff_check = (
        supabase.table("staff").select("id").eq("id", str(payload.staff_id)).execute()
    )
    if not staff_check.data:
        raise HTTPException(status_code=404, detail="Staff member not found")

    # Close any currently open structure
    open_structures = (
        supabase.table("salary_structures")
        .select("id")
        .eq("staff_id", str(payload.staff_id))
        .is_("effective_to", "null")
        .execute()
    )
    for s in open_structures.data:
        prior = date.fromordinal(payload.effective_from.toordinal() - 1).isoformat()
        supabase.table("salary_structures").update(
            {"effective_to": prior}
        ).eq("id", s["id"]).execute()

    insert_data = payload.model_dump(mode="json")
    response = supabase.table("salary_structures").insert(insert_data).execute()
    return response.data[0]


# ============================================================================
# Payroll periods
# ============================================================================


@router.get("/periods")
def list_payroll_periods(
    outlet_id: UUID | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
):
    supabase = get_supabase()
    query = supabase.table("payroll_periods").select("*, outlets(name)")
    if outlet_id:
        query = query.eq("outlet_id", str(outlet_id))
    if status_filter:
        query = query.eq("status", status_filter)
    response = query.order("period_start", desc=True).execute()
    return {"count": len(response.data), "periods": response.data}


@router.get("/periods/{period_id}")
def get_payroll_period(period_id: UUID):
    """Get a payroll period with all its entries (incl. snapshotted bank details)."""
    supabase = get_supabase()

    period = (
        supabase.table("payroll_periods")
        .select("*, outlets(name)")
        .eq("id", str(period_id))
        .single()
        .execute()
    )
    if not period.data:
        raise HTTPException(status_code=404, detail="Payroll period not found")

    entries = (
        supabase.table("payroll_entries")
        .select("*, staff(first_name, last_name, role_id, roles(name))")
        .eq("period_id", str(period_id))
        .execute()
    )

    return {"period": period.data, "entries": entries.data}


@router.post("/periods", status_code=status.HTTP_201_CREATED)
def create_payroll_period(payload: PayrollPeriodCreate):
    supabase = get_supabase()

    if payload.period_end <= payload.period_start:
        raise HTTPException(status_code=400, detail="period_end must be after period_start")

    outlet_check = (
        supabase.table("outlets").select("id").eq("id", str(payload.outlet_id)).execute()
    )
    if not outlet_check.data:
        raise HTTPException(status_code=400, detail="Outlet not found")

    insert_data = payload.model_dump(mode="json", exclude_none=True)
    response = supabase.table("payroll_periods").insert(insert_data).execute()
    if not response.data:
        raise HTTPException(
            status_code=409,
            detail="A payroll period already exists for this outlet and date range",
        )

    return response.data[0]


@router.post("/periods/{period_id}/generate")
def generate_payroll_entries(period_id: UUID):
    """Auto-create payroll entries for active staff at the outlet.

    For each staff:
      - Pull active salary structure (gross_salary)
      - Snapshot bank details onto the entry
      - Pull pending deductions: active loan installments, pending advances, approved fines
      - Sum into entry.deductions, snapshot each into payroll_entry_deductions
      - Compute net = (working_days/30) * gross - deductions
    """
    supabase = get_supabase()

    period = (
        supabase.table("payroll_periods")
        .select("*")
        .eq("id", str(period_id))
        .single()
        .execute()
    )
    if not period.data:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    if period.data["status"] != "draft":
        raise HTTPException(
            status_code=400, detail="Cannot regenerate — period is no longer in draft"
        )

    outlet_id = period.data["outlet_id"]
    period_end = period.data["period_end"]

    # === Unwind any prior generation ===
    # Get entry IDs first, then collect their deduction snapshots so we can revert source items
    prior_entries = (
        supabase.table("payroll_entries").select("id").eq("period_id", str(period_id)).execute()
    )
    if prior_entries.data:
        prior_entry_ids = [e["id"] for e in prior_entries.data]
        # Revert advances and fines that pointed at this period (they'll be re-applied below)
        supabase.table("salary_advances").update(
            {"status": "pending", "applied_to_period_id": None}
        ).eq("applied_to_period_id", str(period_id)).execute()
        supabase.table("fines").update(
            {"status": "approved", "applied_to_period_id": None}
        ).eq("applied_to_period_id", str(period_id)).execute()
        # Loans don't get reverted on draft regeneration — their balance stays as-is.
        # On approve, we'll commit the loan deduction. On unwind here, since we never
        # actually decremented the balance during draft generation, nothing to revert.
        # Cascade-delete entry deduction snapshots
        supabase.table("payroll_entries").delete().eq("period_id", str(period_id)).execute()

    # === Pull active staff at this outlet ===
    staff_resp = (
        supabase.table("staff")
        .select("id, first_name, last_name, bank_name, bank_account_number, bank_account_name")
        .eq("outlet_id", outlet_id)
        .eq("status", "active")
        .execute()
    )

    total_gross = Decimal("0")
    total_net = Decimal("0")
    skipped: list[str] = []

    for staff in staff_resp.data:
        # Find active salary structure
        structures = (
            supabase.table("salary_structures")
            .select("*")
            .eq("staff_id", staff["id"])
            .lte("effective_from", period_end)
            .order("effective_from", desc=True)
            .execute()
        )
        active = next(
            (
                s
                for s in structures.data
                if s["effective_to"] is None or s["effective_to"] >= period_end
            ),
            None,
        )
        if not active:
            skipped.append(f"{staff['first_name']} {staff['last_name']} (no salary set)")
            continue

        gross = Decimal(str(active["gross_salary"]))

        # === Collect deduction items for this staff ===
        deduction_items: list[dict] = []
        total_deductions = Decimal("0")

        # 1. Active loans → take min(monthly_installment, balance)
        loans = (
            supabase.table("loans")
            .select("*")
            .eq("staff_id", staff["id"])
            .eq("status", "active")
            .execute()
        )
        for loan in loans.data:
            balance = Decimal(str(loan["balance"]))
            installment = Decimal(str(loan["monthly_installment"]))
            applied = min(installment, balance)
            if applied > 0:
                deduction_items.append(
                    {
                        "source_type": "loan",
                        "source_id": loan["id"],
                        "amount": float(applied),
                        "description": f"Loan installment (₦{loan['principal']:.0f} principal)",
                    }
                )
                total_deductions += applied

        # 2. Pending advances → take full amount, mark as applied
        advances = (
            supabase.table("salary_advances")
            .select("*")
            .eq("staff_id", staff["id"])
            .eq("status", "pending")
            .execute()
        )
        for adv in advances.data:
            amt = Decimal(str(adv["amount"]))
            deduction_items.append(
                {
                    "source_type": "advance",
                    "source_id": adv["id"],
                    "amount": float(amt),
                    "description": f"Salary advance: {adv.get('reason') or 'no reason given'}",
                }
            )
            total_deductions += amt
            # Mark applied immediately
            supabase.table("salary_advances").update(
                {"status": "applied", "applied_to_period_id": str(period_id)}
            ).eq("id", adv["id"]).execute()

        # 3. Approved fines → take full amount, mark as applied
        fines = (
            supabase.table("fines")
            .select("*")
            .eq("staff_id", staff["id"])
            .eq("status", "approved")
            .execute()
        )
        for fine in fines.data:
            amt = Decimal(str(fine["amount"]))
            deduction_items.append(
                {
                    "source_type": "fine",
                    "source_id": fine["id"],
                    "amount": float(amt),
                    "description": f"Fine: {fine['reason']}",
                }
            )
            total_deductions += amt
            supabase.table("fines").update(
                {"status": "applied", "applied_to_period_id": str(period_id)}
            ).eq("id", fine["id"]).execute()

        # === Compute net ===
        net = compute_net_salary(gross_salary=gross, working_days=30, deductions=total_deductions)

        # Insert entry
        entry_resp = (
            supabase.table("payroll_entries")
            .insert(
                {
                    "period_id": str(period_id),
                    "staff_id": staff["id"],
                    "gross_salary": float(gross),
                    "working_days": 30,
                    "deductions": float(total_deductions),
                    "net_pay": float(net),
                    "bank_name": staff.get("bank_name"),
                    "bank_account_number": staff.get("bank_account_number"),
                    "bank_account_name": staff.get("bank_account_name"),
                    "payment_status": "pending",
                }
            )
            .execute()
        )
        entry_id = entry_resp.data[0]["id"]

        # Snapshot deduction items
        if deduction_items:
            for item in deduction_items:
                item["entry_id"] = entry_id
            supabase.table("payroll_entry_deductions").insert(deduction_items).execute()

        total_gross += gross
        total_net += net

    supabase.table("payroll_periods").update(
        {"total_gross": float(total_gross), "total_net": float(total_net)}
    ).eq("id", str(period_id)).execute()

    return {
        "period_id": str(period_id),
        "entries_created": len(staff_resp.data) - len(skipped),
        "skipped": skipped,
        "total_gross": float(total_gross),
        "total_net": float(total_net),
    }

@router.post("/periods/{period_id}/approve")
def approve_payroll_period(period_id: UUID):
    """Lock the period and commit loan balance decrements."""
    supabase = get_supabase()

    period = (
        supabase.table("payroll_periods")
        .select("status")
        .eq("id", str(period_id))
        .single()
        .execute()
    )
    if not period.data:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    if period.data["status"] != "draft":
        raise HTTPException(status_code=400, detail="Period is not in draft status")

    # === Commit loan balance decrements ===
    loan_deductions = (
        supabase.table("payroll_entry_deductions")
        .select("source_id, amount, payroll_entries!inner(period_id)")
        .eq("source_type", "loan")
        .eq("payroll_entries.period_id", str(period_id))
        .execute()
    )

    # Group by loan and sum (a single loan only contributes once per period, but defensive)
    from collections import defaultdict
    per_loan: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for d in loan_deductions.data:
        per_loan[d["source_id"]] += Decimal(str(d["amount"]))

    for loan_id, total in per_loan.items():
        loan = supabase.table("loans").select("balance").eq("id", loan_id).single().execute()
        new_balance = Decimal(str(loan.data["balance"])) - total
        update = {"balance": float(max(new_balance, Decimal("0")))}
        if new_balance <= 0:
            update["status"] = "paid_off"
        supabase.table("loans").update(update).eq("id", loan_id).execute()

    # === Lock the period ===
    response = (
        supabase.table("payroll_periods")
        .update(
            {
                "status": "approved",
                "approved_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        .eq("id", str(period_id))
        .execute()
    )
    return response.data[0]


# ============================================================================
# Payroll entries
# ============================================================================


@router.patch("/entries/{entry_id}")
def update_payroll_entry(entry_id: UUID, payload: PayrollEntryUpdate):
    """Edit gross, working days, or deductions. Net is auto-recomputed."""
    supabase = get_supabase()

    entry = (
        supabase.table("payroll_entries")
        .select("*, payroll_periods(status)")
        .eq("id", str(entry_id))
        .single()
        .execute()
    )
    if not entry.data:
        raise HTTPException(status_code=404, detail="Payroll entry not found")
    if entry.data["payroll_periods"]["status"] != "draft":
        raise HTTPException(
            status_code=400, detail="Cannot edit entries in an approved period"
        )

    gross = Decimal(
        str(payload.gross_salary if payload.gross_salary is not None else entry.data["gross_salary"])
    )
    working_days = (
        payload.working_days if payload.working_days is not None else entry.data["working_days"]
    )
    deductions = Decimal(
        str(payload.deductions if payload.deductions is not None else entry.data["deductions"])
    )

    net = compute_net_salary(gross_salary=gross, working_days=working_days, deductions=deductions)

    update_data = {
        "gross_salary": float(gross),
        "working_days": working_days,
        "deductions": float(deductions),
        "net_pay": float(net),
    }
    if payload.notes is not None:
        update_data["notes"] = payload.notes

    response = (
        supabase.table("payroll_entries")
        .update(update_data)
        .eq("id", str(entry_id))
        .execute()
    )

    _refresh_period_totals(supabase, entry.data["period_id"])
    return response.data[0]

@router.get("/entries/{entry_id}/deductions")
def get_entry_deductions(entry_id: UUID):
    """Show the breakdown of what makes up an entry's total deductions."""
    supabase = get_supabase()
    response = (
        supabase.table("payroll_entry_deductions")
        .select("*")
        .eq("entry_id", str(entry_id))
        .order("source_type")
        .execute()
    )
    return {"count": len(response.data), "items": response.data}


def _refresh_period_totals(supabase, period_id: str) -> None:
    entries = (
        supabase.table("payroll_entries")
        .select("gross_salary, net_pay")
        .eq("period_id", period_id)
        .execute()
    )
    total_gross = sum(Decimal(str(e["gross_salary"])) for e in entries.data)
    total_net = sum(Decimal(str(e["net_pay"])) for e in entries.data)
    supabase.table("payroll_periods").update(
        {"total_gross": float(total_gross), "total_net": float(total_net)}
    ).eq("id", period_id).execute()