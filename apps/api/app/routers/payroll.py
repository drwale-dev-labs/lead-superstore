from collections import defaultdict
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import UUID
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

from app.core.db import get_supabase
from app.schemas.payroll import (
    AddCatchUpRequest,
    PayrollEntryUpdate,
    PayrollPeriodCreate,
    SalaryStructureCreate,
)
from app.services.payroll import (
    already_has_catch_up,
    calendar_days_worked_in_period,
    compute_net_salary,
    find_backdated_periods,
)
from app.services import training_bond

router = APIRouter()


# ============================================================================
# Salary structures
# ============================================================================


@router.get("/salary-structures")
def list_salary_structures(staff_id: UUID | None = Query(None)):
    supabase = get_supabase()
    query = supabase.table("salary_structures").select(
        "*, staff!salary_structures_staff_id_fkey(first_name, last_name)"
    )
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
    """Get a payroll period with all its entries."""
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
    .select(
        "*, staff(first_name, last_name, role_id, bank_sort_code, roles(name))"
    )
    .eq("period_id", str(period_id))
    .execute()
)

    return {"period": period.data, "entries": entries.data}


@router.post("/periods", status_code=status.HTTP_201_CREATED)
def create_payroll_period(payload: PayrollPeriodCreate):
    """Create a draft payroll period for an outlet."""
    supabase = get_supabase()

    if payload.period_end <= payload.period_start:
        raise HTTPException(
            status_code=400, detail="period_end must be after period_start"
        )

    insert_data = payload.model_dump(mode="json", exclude_none=True)
    response = supabase.table("payroll_periods").insert(insert_data).execute()
    return response.data[0]


@router.post("/periods/{period_id}/generate")
def generate_payroll_entries(period_id: UUID):
    """Auto-create payroll entries for active staff at the outlet.

    For each staff:
      - Pull active salary structure (gross_salary)
      - Snapshot bank details onto the entry
      - Pull pending deductions: active loan installments, pending advances,
        approved fines
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
            status_code=400,
            detail="Cannot regenerate — period is no longer in draft",
        )

    outlet_id = period.data["outlet_id"]
    period_start_str = period.data["period_start"]
    period_end = period.data["period_end"]
    period_start = date.fromisoformat(period_start_str)
    period_end_date = date.fromisoformat(period_end)

    # === Unwind any prior generation ===
    prior_entries = (
        supabase.table("payroll_entries")
        .select("id")
        .eq("period_id", str(period_id))
        .execute()
    )
    if prior_entries.data:
        # Revert advances and fines that pointed at this period
        supabase.table("salary_advances").update(
            {"status": "pending", "applied_to_period_id": None}
        ).eq("applied_to_period_id", str(period_id)).execute()
        supabase.table("fines").update(
            {"status": "approved", "applied_to_period_id": None}
        ).eq("applied_to_period_id", str(period_id)).execute()
        # Cascade-delete entries (and their deduction snapshots)
        supabase.table("payroll_entries").delete().eq(
            "period_id", str(period_id)
        ).execute()

    # === Pull staff eligible for this period ===
    # Active staff (normal case, plus mid-period hires — hired_at trims their days).
    active_staff_resp = (
        supabase.table("staff")
        .select(
            "id, first_name, last_name, bank_name, "
            "bank_account_number, bank_account_name, hired_at, terminated_at"
        )
        .eq("outlet_id", outlet_id)
        .eq("status", "active")
        .execute()
    )
    # Staff terminated during this period still worked part of it and are owed
    # a final prorated paycheck — without this they'd be silently skipped since
    # they're no longer 'active' by the time payroll runs.
    terminated_staff_resp = (
        supabase.table("staff")
        .select(
            "id, first_name, last_name, bank_name, "
            "bank_account_number, bank_account_name, hired_at, terminated_at"
        )
        .eq("outlet_id", outlet_id)
        .eq("status", "terminated")
        .gte("terminated_at", period_start_str)
        .lte("terminated_at", period_end)
        .execute()
    )
    staff_list = active_staff_resp.data + terminated_staff_resp.data

    total_gross = Decimal("0")
    total_net = Decimal("0")
    skipped: list[str] = []
    backdated: list[dict] = []

    for staff in staff_list:
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
            skipped.append(
                f"{staff['first_name']} {staff['last_name']} (no salary set)"
            )
            continue

        gross = Decimal(str(active["gross_salary"]))

        # === Proration: mid-period hire or mid-period termination ===
        hired_at = date.fromisoformat(staff["hired_at"]) if staff.get("hired_at") else None
        terminated_at = (
            date.fromisoformat(staff["terminated_at"]) if staff.get("terminated_at") else None
        )
        days_worked = calendar_days_worked_in_period(
            period_start, period_end_date, hired_at, terminated_at
        )
        working_days = min(days_worked, 30)
        proration_ratio = Decimal(working_days) / Decimal("30")

        # === Collect deduction items for this staff ===
        # Loan installments and the training bond are recurring per-period amounts,
        # so they prorate with days worked. Advances and fines are flat one-time
        # amounts tied to a specific request/incident, so they always charge in full
        # regardless of partial-period employment (confirmed with the business owner).
        deduction_items: list[dict] = []
        total_deductions = Decimal("0")

        # 1. Active loans → take min(monthly_installment, balance), prorated
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
            full_applied = min(installment, balance)
            applied = min(full_applied * proration_ratio, balance).quantize(Decimal("0.01"))
            if applied > 0:
                prorated_note = (
                    f" — prorated for {working_days}/30 days" if working_days < 30 else ""
                )
                deduction_items.append(
                    {
                        "source_type": "loan",
                        "source_id": loan["id"],
                        "amount": float(applied),
                        "description": (
                            f"Loan installment (₦{loan['principal']:.0f} principal)"
                            f"{prorated_note}"
                        ),
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
                    "description": (
                        f"Salary advance: {adv.get('reason') or 'no reason given'}"
                    ),
                }
            )
            total_deductions += amt
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

        # 4. Training bond (₦5,000/month deduction for months 1-6, payback months 7-12).
        # Deduction is prorated like the loan installment above; payback is not
        # prorated (it's the company returning money already deducted in full months).
        bond_item = None
        bond = None
        if hired_at:
            bond = training_bond.get_or_create_bond(supabase, staff["id"], hired_at)
            if bond:
                bond_item = training_bond.compute_bond_item(bond, period_end_date)
                if bond_item and bond_item["direction"] == "deduct":
                    prorated_amount = (bond_item["amount"] * proration_ratio).quantize(
                        Decimal("0.01")
                    )
                    prorated_note = (
                        f" — prorated for {working_days}/30 days" if working_days < 30 else ""
                    )
                    deduction_items.append(
                        {
                            "source_type": "training_bond",
                            "source_id": bond["id"],
                            "amount": float(prorated_amount),
                            "description": (
                                f"Training bond deduction (month {bond_item['month_number']} of 6)"
                                f"{prorated_note}"
                            ),
                        }
                    )
                    total_deductions += prorated_amount
                    # Keep the item's amount in sync with what was actually charged,
                    # so record_bond_item below commits the prorated figure, not the
                    # flat monthly rate — this is the source of truth for running totals.
                    bond_item["amount"] = prorated_amount

        # === Compute net ===
        net = compute_net_salary(
            gross_salary=gross, working_days=working_days, deductions=total_deductions
        )
        # Bond payback is added to net pay, not part of the deductions subtraction above
        # (not prorated — it's returning money already deducted in full months).
        if bond_item and bond_item["direction"] == "payback":
            net += bond_item["amount"]

        # Insert entry
        entry_resp = (
            supabase.table("payroll_entries")
            .insert(
                {
                    "period_id": str(period_id),
                    "staff_id": staff["id"],
                    "gross_salary": float(gross),
                    "working_days": working_days,
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
            supabase.table("payroll_entry_deductions").insert(
                deduction_items
            ).execute()

        # Snapshot bond item (deduct items are also in payroll_entry_deductions above
        # for the deductions total; this table is the source of truth for bond state)
        if bond_item and bond:
            training_bond.record_bond_item(supabase, bond["id"], bond_item, entry_id)

        # === Detect backdated periods (Phase 8b) ===
        # Never auto-included — surfaced for HR to review and explicitly approve
        # via POST /entries/{entry_id}/catch-up.
        if hired_at:
            missed = find_backdated_periods(supabase, staff["id"], outlet_id, hired_at)
            for m in missed:
                estimated = compute_net_salary(
                    gross_salary=gross, working_days=m["days_owed"], deductions=Decimal("0")
                )
                backdated.append(
                    {
                        "staff_id": str(staff["id"]),
                        "staff_name": f"{staff['first_name']} {staff['last_name']}",
                        "entry_id": entry_id,
                        "missed_period_id": m["period_id"],
                        "missed_period_label": (
                            f"{m['period_start'].isoformat()} to {m['period_end'].isoformat()}"
                        ),
                        "days_owed": m["days_owed"],
                        "estimated_amount": float(estimated),
                    }
                )

        total_gross += gross
        total_net += net

    supabase.table("payroll_periods").update(
        {"total_gross": float(total_gross), "total_net": float(total_net)}
    ).eq("id", str(period_id)).execute()

    return {
        "period_id": str(period_id),
        "entries_created": len(staff_list) - len(skipped),
        "skipped": skipped,
        "backdated": backdated,
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

    # Commit loan balance decrements
    loan_deductions = (
        supabase.table("payroll_entry_deductions")
        .select("source_id, amount, payroll_entries!inner(period_id)")
        .eq("source_type", "loan")
        .eq("payroll_entries.period_id", str(period_id))
        .execute()
    )

    per_loan: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for d in loan_deductions.data:
        per_loan[d["source_id"]] += Decimal(str(d["amount"]))

    for loan_id, total in per_loan.items():
        loan = (
            supabase.table("loans")
            .select("balance")
            .eq("id", loan_id)
            .single()
            .execute()
        )
        new_balance = Decimal(str(loan.data["balance"])) - total
        update = {"balance": float(max(new_balance, Decimal("0")))}
        if new_balance <= 0:
            update["status"] = "paid_off"
        supabase.table("loans").update(update).eq("id", loan_id).execute()

    # Commit training bond running totals
    training_bond.commit_bond_items_for_period(supabase, str(period_id))

    # Lock the period
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
        str(
            payload.gross_salary
            if payload.gross_salary is not None
            else entry.data["gross_salary"]
        )
    )
    working_days = (
        payload.working_days
        if payload.working_days is not None
        else entry.data["working_days"]
    )
    deductions = Decimal(
        str(
            payload.deductions
            if payload.deductions is not None
            else entry.data["deductions"]
        )
    )

    net = compute_net_salary(
        gross_salary=gross, working_days=working_days, deductions=deductions
    )

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


@router.get("/entries/{entry_id}/bond-items")
def get_entry_bond_items(entry_id: UUID):
    """Show training bond deduct/payback items for this entry, if any.

    Deduct items also appear in /deductions (they're part of the deductions
    total); payback items only appear here since they add to net pay.
    """
    supabase = get_supabase()
    response = (
        supabase.table("payroll_entry_bond_items")
        .select("*")
        .eq("entry_id", str(entry_id))
        .execute()
    )
    return {"count": len(response.data), "items": response.data}


@router.get("/entries/{entry_id}/catch-ups")
def get_entry_catch_ups(entry_id: UUID):
    """Show backdated catch-up line items added to this entry, if any."""
    supabase = get_supabase()
    response = (
        supabase.table("payroll_entry_catchups")
        .select("*, payroll_periods!missed_period_id(period_start, period_end)")
        .eq("entry_id", str(entry_id))
        .execute()
    )
    return {"count": len(response.data), "items": response.data}


@router.post("/entries/{entry_id}/catch-up", status_code=status.HTTP_201_CREATED)
def add_catch_up(entry_id: UUID, payload: AddCatchUpRequest):
    """HR explicitly approves a backdated catch-up for one missed period.

    Adds a distinct, traceable line item to THIS (current) entry — the
    original missed period is never reopened or touched. Base pay only; no
    deductions are retroactively computed for the missed period (see
    BUGFIX_RUNBOOK.md Phase 8b).
    """
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
            status_code=400, detail="Cannot add a catch-up to an approved period"
        )

    staff_id = entry.data["staff_id"]

    if already_has_catch_up(supabase, staff_id, str(payload.missed_period_id)):
        raise HTTPException(
            status_code=409, detail="A catch-up for this staff/period has already been added"
        )

    missed_period = (
        supabase.table("payroll_periods")
        .select("period_start, period_end")
        .eq("id", str(payload.missed_period_id))
        .single()
        .execute()
    )
    if not missed_period.data:
        raise HTTPException(status_code=404, detail="Missed period not found")

    staff = supabase.table("staff").select("hired_at").eq("id", staff_id).single().execute()
    hired_at = date.fromisoformat(staff.data["hired_at"]) if staff.data.get("hired_at") else None
    if not hired_at:
        raise HTTPException(status_code=400, detail="Staff member has no hire date on file")

    period_start = date.fromisoformat(missed_period.data["period_start"])
    period_end = date.fromisoformat(missed_period.data["period_end"])
    days_owed = calendar_days_worked_in_period(period_start, period_end, hired_at, None)
    if days_owed <= 0:
        raise HTTPException(
            status_code=400, detail="Staff member's hire date does not fall within this period"
        )

    gross = Decimal(str(entry.data["gross_salary"]))
    amount = compute_net_salary(gross_salary=gross, working_days=days_owed, deductions=Decimal("0"))

    supabase.table("payroll_entry_catchups").insert(
        {
            "entry_id": str(entry_id),
            "staff_id": staff_id,
            "missed_period_id": str(payload.missed_period_id),
            "days_owed": days_owed,
            "amount": float(amount),
            "description": (
                f"Backdated catch-up: {period_start.isoformat()} to {period_end.isoformat()}"
            ),
        }
    ).execute()

    new_catch_up_total = Decimal(str(entry.data.get("catch_up_pay") or 0)) + amount
    new_net = Decimal(str(entry.data["net_pay"])) + amount

    updated = (
        supabase.table("payroll_entries")
        .update({"catch_up_pay": float(new_catch_up_total), "net_pay": float(new_net)})
        .eq("id", str(entry_id))
        .execute()
    )

    _refresh_period_totals(supabase, entry.data["period_id"])

    return updated.data[0]


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

# ============================================================================
# Export bank sheet
# ============================================================================
@router.get("/periods/{period_id}/export-bank-sheet")
def export_bank_sheet(period_id: UUID):
    """Export approved payroll entries as a bulk bank-payment xlsx.

    Matches the bank's required column format exactly:
    PaymentAmount | PaymentDate | Reference | Remark | VendorCode |
    VendorName | VendorAcctNumber | VendorBankSortCode
    """
    supabase = get_supabase()

    period_resp = (
        supabase.table("payroll_periods")
        .select("*, outlets(name)")
        .eq("id", str(period_id))
        .single()
        .execute()
    )
    if not period_resp.data:
        raise HTTPException(status_code=404, detail="Payroll period not found")
    period = period_resp.data

    entries_resp = (
        supabase.table("payroll_entries")
        .select(
            "net_pay, bank_account_number, bank_account_name, "
            "staff(first_name, last_name, bank_sort_code)"
        )
        .eq("period_id", str(period_id))
        .execute()
    )
    if not entries_resp.data:
        raise HTTPException(status_code=400, detail="No payroll entries to export for this period")

    period_end = date.fromisoformat(period["period_end"])
    # Default payment date: 5th of the month after the period ends
    if period_end.month == 12:
        pay_date = date(period_end.year + 1, 1, 5)
    else:
        pay_date = date(period_end.year, period_end.month + 1, 5)
    payment_date_str = pay_date.strftime("%d/%B/%Y").upper()

    month_label = period_end.strftime("%B %Y").upper()
    remark = f"SALARY FOR {month_label}"

    outlet_name = (period.get("outlets") or {}).get("name", "OUTLET")
    sheet_name = outlet_name[:31]  # Excel sheet name limit

    missing = [
        e for e in entries_resp.data
        if not e.get("bank_account_number") or not (e.get("staff") or {}).get("bank_sort_code")
    ]

    wb = Workbook()
    ws = wb.active
    ws.title = sheet_name

    headers = [
        "PaymentAmount (number format, 2 decimal places (max)",
        "PaymentDate (text format, dd / mmm / yyyy, max. 11 characters)",
        "Reference (optional i.e cells can be left blank, text format, alpha-numeric, max. 20 characters)",
        "Remark (text format, alpha-numeric, max. 25 characters)",
        "VendorCode (text format, max. of 32 characters, e.g staff I.D, RC no. or name)",
        "VendorName (text format, alpha-numeric, max. 50 characters)",
        "VendorAcctNumber (text format, numeric, max. 15 digits)",
        "VendorBankSortCode (text format, 9 digits)",
    ]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)

    for e in entries_resp.data:
        staff = e.get("staff") or {}
        full_name = f"{staff.get('first_name', '')} {staff.get('last_name', '')}".strip()
        ws.append([
            round(float(e["net_pay"]), 2),
            payment_date_str,
            "",
            remark[:25],
            full_name[:32],
            (e.get("bank_account_name") or full_name)[:50],
            e.get("bank_account_number") or "",
            staff.get("bank_sort_code") or "",
        ])

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"{outlet_name.replace(' ', '_')}_salary_{period_end.strftime('%b%Y')}.xlsx"
    headers_out = {"Content-Disposition": f'attachment; filename="{filename}"'}
    if missing:
        headers_out["X-Missing-Bank-Details"] = str(len(missing))

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers_out,
    )