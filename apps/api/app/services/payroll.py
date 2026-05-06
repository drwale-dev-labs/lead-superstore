"""Payroll computation — simple proportional model.

Net = (working_days / 30) * gross_salary - deductions

Allowances are NOT computed in payroll (paid at discretion, separately).
PAYE, pension, NHF, CRA are NOT applied at this stage.
"""

from decimal import ROUND_HALF_UP, Decimal

WORKING_DAYS_BASE = Decimal("30")


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