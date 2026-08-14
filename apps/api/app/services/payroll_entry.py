"""Pure per-staff payroll entry computation — no Supabase calls.

Extracted from the per-staff loop in generate_payroll_entries so the money
math (proration, deduction stacking, net calc, backdated-catch-up detection)
can be tested directly against known scenarios without a database.

The router is still responsible for: fetching input data, resolving/creating
the staff member's training bond (a genuine side effect — see
training_bond.get_or_create_bond), inserting the returned rows, and marking
applied advances/fines in the DB.
"""

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from app.services.payroll import calendar_days_worked_in_period, compute_net_salary
from app.services.training_bond import compute_bond_item


@dataclass
class StaffPayrollInput:
    id: str
    first_name: str
    last_name: str
    bank_name: str | None
    bank_account_number: str | None
    bank_account_name: str | None
    hired_at: date | None
    terminated_at: date | None
    gross_salary: Decimal
    loans: list[dict] = field(default_factory=list)
    advances: list[dict] = field(default_factory=list)
    fines: list[dict] = field(default_factory=list)
    bond: dict | None = None


@dataclass
class PayrollEntryResult:
    staff_id: str
    working_days: int
    gross_salary: Decimal
    total_deductions: Decimal
    net_pay: Decimal
    deduction_items: list[dict]
    bond_item: dict | None
    advance_ids_to_apply: list[str]
    fine_ids_to_apply: list[str]


def compute_entry_for_staff(
    staff: StaffPayrollInput,
    period_start: date,
    period_end: date,
) -> PayrollEntryResult:
    """Compute one staff member's payroll entry for a period.

    Pure: given the same inputs, always produces the same result. Bond
    eligibility/creation must be resolved by the caller beforehand — this
    function only decides what the bond does THIS period (deduct/payback/
    nothing) via compute_bond_item, using the bond record passed in.
    """
    days_worked = calendar_days_worked_in_period(
        period_start, period_end, staff.hired_at, staff.terminated_at
    )
    working_days = min(days_worked, 30)
    proration_ratio = Decimal(working_days) / Decimal("30")

    deduction_items: list[dict] = []
    total_deductions = Decimal("0")

    # 1. Active loans → take min(monthly_installment, balance), prorated.
    # Recurring per-period amount, so it prorates with days worked.
    for loan in staff.loans:
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

    # 2. Pending advances → take full amount. Flat one-time amount tied to a
    # specific request, so it always charges in full regardless of partial-
    # period employment (confirmed with the business owner).
    advance_ids_to_apply: list[str] = []
    for adv in staff.advances:
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
        advance_ids_to_apply.append(adv["id"])

    # 3. Approved fines → take full amount. Same flat-amount reasoning as advances.
    fine_ids_to_apply: list[str] = []
    for fine in staff.fines:
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
        fine_ids_to_apply.append(fine["id"])

    # 4. Training bond (₦5,000/month deduction for months 1-6, payback months
    # 7-12). Deduction is prorated like the loan installment above; payback is
    # not prorated (it's the company returning money already deducted in full
    # months).
    bond_item = None
    if staff.bond:
        bond_item = compute_bond_item(staff.bond, period_end)
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
                    "source_id": staff.bond["id"],
                    "amount": float(prorated_amount),
                    "description": (
                        f"Training bond deduction (month {bond_item['month_number']} of 6)"
                        f"{prorated_note}"
                    ),
                }
            )
            total_deductions += prorated_amount
            # Keep the item's amount in sync with what was actually charged,
            # so the caller commits the prorated figure, not the flat
            # monthly rate — this is the source of truth for running totals.
            bond_item["amount"] = prorated_amount

    net = compute_net_salary(
        gross_salary=staff.gross_salary, working_days=working_days, deductions=total_deductions
    )
    # Bond payback is added to net pay, not part of the deductions subtraction
    # above (not prorated — it's returning money already deducted in full months).
    if bond_item and bond_item["direction"] == "payback":
        net += bond_item["amount"]

    return PayrollEntryResult(
        staff_id=staff.id,
        working_days=working_days,
        gross_salary=staff.gross_salary,
        total_deductions=total_deductions,
        net_pay=net,
        deduction_items=deduction_items,
        bond_item=bond_item,
        advance_ids_to_apply=advance_ids_to_apply,
        fine_ids_to_apply=fine_ids_to_apply,
    )
