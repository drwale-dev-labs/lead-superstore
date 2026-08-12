"""Payroll computation — simple proportional model.

Net = (working_days / 30) * gross_salary - deductions

Allowances are NOT computed in payroll (paid at discretion, separately).
PAYE, pension, NHF, CRA are NOT applied at this stage.
"""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

WORKING_DAYS_BASE = Decimal("30")


def calendar_days_worked_in_period(
    period_start: date,
    period_end: date,
    hired_at: date | None,
    terminated_at: date | None,
) -> int:
    """Days actually worked within [period_start, period_end], inclusive.

    - Mid-period hire: from hired_at to period_end.
    - Mid-period termination: from period_start to terminated_at.
    - Full-period active staff: the full period (unchanged from prior behavior).
    - Capped to the period bounds either way, so a hired_at/terminated_at
      outside the period doesn't produce a nonsensical range.
    """
    effective_start = period_start
    if hired_at and hired_at > period_start:
        effective_start = min(hired_at, period_end)

    effective_end = period_end
    if terminated_at and terminated_at < period_end:
        effective_end = max(terminated_at, period_start)

    if effective_end < effective_start:
        return 0
    return (effective_end - effective_start).days + 1


def _quantize(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def compute_net_salary(
    gross_salary: Decimal,
    working_days: int = 30,
    deductions: Decimal = Decimal("0"),
) -> Decimal:
    """Compute net salary using the simple proportional formula.

    Net = (working_days / 30) * gross - deductions

    If working_days > 30, the staff is paid the full gross (overtime is handled
    separately via discretionary allowances, not via this formula).
    """
    days = min(Decimal(working_days), WORKING_DAYS_BASE)
    proportion = days / WORKING_DAYS_BASE
    earned = gross_salary * proportion
    net = earned - deductions
    return _quantize(net)


# ============================================================================
# Backdated catch-up (Phase 8b)
# ============================================================================


def find_backdated_periods(
    supabase, staff_id: str, outlet_id: str, hired_at: date
) -> list[dict]:
    """Find prior GENERATED periods (for this staff's outlet) where hired_at
    falls within the period but this staff has no payroll entry at all.

    Detection only — never auto-included in any total. HR reviews and
    explicitly approves each catch-up via add_catch_up_item.
    """
    prior_periods = (
        supabase.table("payroll_periods")
        .select("id, period_start, period_end, status")
        .eq("outlet_id", outlet_id)
        .lte("period_start", hired_at.isoformat())
        .neq("status", "draft")
        .execute()
    )

    missing: list[dict] = []
    for period in prior_periods.data:
        period_start = date.fromisoformat(period["period_start"])
        period_end = date.fromisoformat(period["period_end"])
        if hired_at > period_end:
            continue

        existing_entry = (
            supabase.table("payroll_entries")
            .select("id")
            .eq("period_id", period["id"])
            .eq("staff_id", staff_id)
            .execute()
        )
        if existing_entry.data:
            continue

        days_owed = calendar_days_worked_in_period(period_start, period_end, hired_at, None)
        if days_owed > 0:
            missing.append(
                {
                    "period_id": period["id"],
                    "period_start": period_start,
                    "period_end": period_end,
                    "days_owed": days_owed,
                }
            )

    return missing


def already_has_catch_up(supabase, staff_id: str, missed_period_id: str) -> bool:
    existing = (
        supabase.table("payroll_entry_catchups")
        .select("id")
        .eq("staff_id", staff_id)
        .eq("missed_period_id", missed_period_id)
        .execute()
    )
    return bool(existing.data)