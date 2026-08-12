"""Training bond — a ₦5,000/month deduction for the first 6 months of a new
hire's employment, paid back at the same rate across months 7–12 if they're
still employed. Applies only to staff hired on or after FEATURE_LAUNCH_DATE.

Rules (confirmed with the business owner):
- Months 1-6 of employment: deduct ₦5,000/month.
- Months 7-12: pay back ₦5,000/month, same rate.
- Leaving before month 6 completes: forfeit whatever was deducted so far —
  no further action, no refund.
- Leaving during months 7-12 (after completing the deduction phase): the
  remaining payback balance is NOT auto-paid — it's flagged for HR to
  decide manually (see check_bond_on_termination).
"""

from datetime import date
from decimal import Decimal
from uuid import UUID

FEATURE_LAUNCH_DATE = date(2026, 8, 11)
MONTHLY_AMOUNT = Decimal("5000")
DEDUCTION_MONTHS = 6
PAYBACK_MONTHS = 12


def is_eligible_for_bond(hired_at: date) -> bool:
    return hired_at >= FEATURE_LAUNCH_DATE


def months_elapsed(hired_at: date, as_of: date) -> int:
    """Full months elapsed between hired_at and as_of, minimum 1.

    A period ending in the same calendar month as hire (or before a full
    month has passed) still counts as month 1 — the bond starts from the
    staff member's first payroll.
    """
    months = (as_of.year - hired_at.year) * 12 + (as_of.month - hired_at.month)
    if as_of.day < hired_at.day:
        months -= 1
    return max(months, 0) + 1


def fetch_bonds_for_staff(supabase, staff_ids: list[str]) -> dict[str, dict]:
    """Batch-fetch existing training bonds for a list of staff IDs, keyed by
    staff_id. Meant to be called ONCE per payroll generation run and passed
    into get_or_create_bond for each staff member, to avoid an N+1 query.
    """
    if not staff_ids:
        return {}
    resp = (
        supabase.table("training_bonds")
        .select("*")
        .in_("staff_id", staff_ids)
        .execute()
    )
    return {row["staff_id"]: row for row in resp.data}


def get_or_create_bond(
    supabase, staff_id: UUID, hired_at: date, existing_bonds: dict[str, dict] | None = None
) -> dict | None:
    """Return the staff member's active training bond, creating it if this is
    their first payroll run and they're eligible. Returns None if ineligible.

    `existing_bonds` (from fetch_bonds_for_staff) lets the caller avoid a
    per-staff lookup query across a batch of staff; falls back to a live
    lookup if not supplied.
    """
    if existing_bonds is not None:
        existing = existing_bonds.get(str(staff_id))
    else:
        resp = (
            supabase.table("training_bonds")
            .select("*")
            .eq("staff_id", str(staff_id))
            .execute()
        )
        existing = resp.data[0] if resp.data else None

    if existing:
        return existing

    if not is_eligible_for_bond(hired_at):
        return None

    created = (
        supabase.table("training_bonds")
        .insert(
            {
                "staff_id": str(staff_id),
                "hired_at": hired_at.isoformat(),
                "monthly_amount": float(MONTHLY_AMOUNT),
            }
        )
        .execute()
    )
    return created.data[0]


def compute_bond_item(bond: dict, period_end: date) -> dict | None:
    """Determine what this payroll period should do for the bond: deduct,
    pay back, or nothing (bond already completed/forfeited, or period is
    beyond month 12). Returns None if no bond item applies this period.
    """
    if bond["status"] != "active":
        return None

    hired_at = date.fromisoformat(bond["hired_at"])
    month = months_elapsed(hired_at, period_end)

    if month <= DEDUCTION_MONTHS:
        return {"direction": "deduct", "amount": MONTHLY_AMOUNT, "month_number": month}
    if month <= PAYBACK_MONTHS:
        return {"direction": "payback", "amount": MONTHLY_AMOUNT, "month_number": month}
    return None


def record_bond_item(supabase, bond_id: str, item: dict, entry_id: str) -> None:
    """Snapshot the bond item against this payroll entry.

    Does NOT touch the bond's running totals — those are only committed when
    the payroll period is approved (see commit_bond_items_for_period), mirroring
    how loan balance decrements only happen on approval, not generation. This
    keeps regenerating a draft period idempotent.
    """
    supabase.table("payroll_entry_bond_items").insert(
        {
            "entry_id": entry_id,
            "bond_id": bond_id,
            "direction": item["direction"],
            "amount": float(item["amount"]),
            "month_number": item["month_number"],
        }
    ).execute()


def commit_bond_items_for_period(supabase, period_id: str) -> None:
    """Apply running-total updates for every bond item snapshot in this period.

    Called once, when the payroll period is approved.
    """
    items = (
        supabase.table("payroll_entry_bond_items")
        .select("bond_id, direction, amount, month_number, payroll_entries!inner(period_id)")
        .eq("payroll_entries.period_id", period_id)
        .execute()
    )

    per_bond: dict[str, dict] = {}
    for item in items.data:
        bond_id = item["bond_id"]
        agg = per_bond.setdefault(
            bond_id, {"deducted": Decimal("0"), "paid_back": Decimal("0"), "max_month": 0}
        )
        if item["direction"] == "deduct":
            agg["deducted"] += Decimal(str(item["amount"]))
        else:
            agg["paid_back"] += Decimal(str(item["amount"]))
        agg["max_month"] = max(agg["max_month"], item["month_number"])

    for bond_id, agg in per_bond.items():
        bond = (
            supabase.table("training_bonds").select("*").eq("id", bond_id).single().execute()
        ).data
        update = {
            "total_deducted": float(Decimal(str(bond["total_deducted"])) + agg["deducted"]),
            "total_paid_back": float(Decimal(str(bond["total_paid_back"])) + agg["paid_back"]),
        }
        if agg["max_month"] >= PAYBACK_MONTHS:
            update["status"] = "completed"
        supabase.table("training_bonds").update(update).eq("id", bond_id).execute()


def check_bond_on_termination(supabase, staff_id: UUID, terminated_at: date) -> dict | None:
    """Called when a staff member is terminated. Forfeits the bond if they
    left before completing month 6; otherwise flags the outstanding payback
    balance for manual HR review without auto-paying it.

    Returns a dict describing what happened, or None if the staff had no
    active bond.
    """
    bond_resp = (
        supabase.table("training_bonds")
        .select("*")
        .eq("staff_id", str(staff_id))
        .eq("status", "active")
        .execute()
    )
    if not bond_resp.data:
        return None
    bond = bond_resp.data[0]

    hired_at = date.fromisoformat(bond["hired_at"])
    month = months_elapsed(hired_at, terminated_at)

    if month <= DEDUCTION_MONTHS:
        supabase.table("training_bonds").update({"status": "forfeited"}).eq(
            "id", bond["id"]
        ).execute()
        return {
            "outcome": "forfeited",
            "amount_forfeited": bond["total_deducted"],
        }

    outstanding = Decimal(str(bond["total_deducted"])) - Decimal(str(bond["total_paid_back"]))
    return {
        "outcome": "review_required",
        "outstanding_balance": float(max(outstanding, Decimal("0"))),
    }
