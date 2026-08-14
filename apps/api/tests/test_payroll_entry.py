"""Characterization tests for compute_entry_for_staff — the pure per-staff
payroll money math extracted from generate_payroll_entries.

Covers the cases documented in the original inline comments: mid-period
hire/termination proration, loan/advance/fine stacking, and training bond
deduct vs. payback behavior.
"""

from datetime import date
from decimal import Decimal

import pytest

from app.services.payroll_entry import StaffPayrollInput, compute_entry_for_staff

PERIOD_START = date(2026, 8, 1)
PERIOD_END = date(2026, 8, 31)  # 31-day period


def make_staff(**overrides) -> StaffPayrollInput:
    defaults = dict(
        id="staff-1",
        first_name="Ada",
        last_name="Lovelace",
        bank_name="Test Bank",
        bank_account_number="0000000000",
        bank_account_name="Ada Lovelace",
        hired_at=None,
        terminated_at=None,
        gross_salary=Decimal("90000"),
        loans=[],
        advances=[],
        fines=[],
        bond=None,
    )
    defaults.update(overrides)
    return StaffPayrollInput(**defaults)


def test_full_period_active_staff_gets_full_gross_no_deductions():
    staff = make_staff()
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.working_days == 30  # capped at 30 even though the period is 31 days
    assert result.total_deductions == Decimal("0")
    assert result.net_pay == Decimal("90000.00")


def test_mid_period_hire_prorates_gross():
    # Hired on the 16th of a 1-31 period -> worked Aug 16 through Aug 31 inclusive = 16 days
    staff = make_staff(hired_at=date(2026, 8, 16))
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.working_days == 16
    expected_net = (Decimal("90000") * Decimal(16) / Decimal(30)).quantize(Decimal("0.01"))
    assert result.net_pay == expected_net


def test_mid_period_termination_prorates_gross():
    # Terminated on the 10th -> worked Aug 1 through Aug 10 inclusive = 10 days
    staff = make_staff(terminated_at=date(2026, 8, 10))
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.working_days == 10
    expected_net = (Decimal("90000") * Decimal(10) / Decimal(30)).quantize(Decimal("0.01"))
    assert result.net_pay == expected_net


def test_loan_installment_deducted_in_full_for_full_period_staff():
    staff = make_staff(
        loans=[{"id": "loan-1", "balance": "50000", "monthly_installment": "10000", "principal": 100000}]
    )
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.total_deductions == Decimal("10000.00")
    assert result.net_pay == Decimal("80000.00")
    assert result.deduction_items[0]["source_type"] == "loan"
    assert result.deduction_items[0]["amount"] == 10000.00


def test_loan_installment_capped_at_remaining_balance():
    staff = make_staff(
        loans=[{"id": "loan-1", "balance": "3000", "monthly_installment": "10000", "principal": 100000}]
    )
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    # Full-month case: min(installment, balance) = 3000, not the full 10000 installment
    assert result.total_deductions == Decimal("3000.00")


def test_loan_installment_prorated_for_mid_period_hire():
    # 16 days worked out of 30 -> proration_ratio = 16/30
    staff = make_staff(
        hired_at=date(2026, 8, 16),
        loans=[{"id": "loan-1", "balance": "50000", "monthly_installment": "10000", "principal": 100000}],
    )
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    expected_deduction = (Decimal("10000") * Decimal(16) / Decimal(30)).quantize(Decimal("0.01"))
    assert result.total_deductions == expected_deduction
    assert "prorated for 16/30 days" in result.deduction_items[0]["description"]


def test_advance_deducted_in_full_regardless_of_proration():
    # Confirmed with the business owner: advances are flat one-time amounts,
    # never prorated even for a mid-period hire.
    staff = make_staff(
        hired_at=date(2026, 8, 16),
        advances=[{"id": "adv-1", "amount": "5000", "reason": "Emergency"}],
    )
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.total_deductions == Decimal("5000")
    assert result.advance_ids_to_apply == ["adv-1"]


def test_fine_deducted_in_full_regardless_of_proration():
    staff = make_staff(
        terminated_at=date(2026, 8, 10),
        fines=[{"id": "fine-1", "amount": "2000", "reason": "Till shortage"}],
    )
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.total_deductions == Decimal("2000")
    assert result.fine_ids_to_apply == ["fine-1"]


def test_stacked_deductions_sum_correctly():
    staff = make_staff(
        loans=[{"id": "loan-1", "balance": "50000", "monthly_installment": "10000", "principal": 100000}],
        advances=[{"id": "adv-1", "amount": "5000", "reason": "x"}],
        fines=[{"id": "fine-1", "amount": "2000", "reason": "y"}],
    )
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.total_deductions == Decimal("17000.00")
    assert result.net_pay == Decimal("73000.00")
    assert len(result.deduction_items) == 3


def test_training_bond_deduction_prorated_for_mid_period_hire():
    bond = {
        "id": "bond-1",
        "staff_id": "staff-1",
        "hired_at": "2026-08-16",
        "status": "active",
        "total_deducted": "0",
        "total_paid_back": "0",
    }
    staff = make_staff(hired_at=date(2026, 8, 16), bond=bond)
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    # Month 1 of the bond -> deduct ₦5000, prorated by 16/30
    expected = (Decimal("5000") * Decimal(16) / Decimal(30)).quantize(Decimal("0.01"))
    assert result.bond_item["direction"] == "deduct"
    assert result.bond_item["amount"] == expected
    assert result.total_deductions == expected


def test_training_bond_payback_added_to_net_not_prorated():
    # Bond hired 7 months before this period's end -> month 7 -> payback phase
    bond = {
        "id": "bond-1",
        "staff_id": "staff-1",
        "hired_at": "2026-01-16",
        "status": "active",
        "total_deducted": "30000",
        "total_paid_back": "0",
    }
    staff = make_staff(bond=bond)  # full-period staff, no proration
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.bond_item["direction"] == "payback"
    assert result.bond_item["amount"] == Decimal("5000")
    # Payback is added on top of gross, not subtracted, and not prorated
    assert result.net_pay == Decimal("95000.00")
    assert result.total_deductions == Decimal("0")


def test_no_bond_when_staff_has_none():
    staff = make_staff(hired_at=date(2026, 8, 1), bond=None)
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.bond_item is None


@pytest.mark.parametrize(
    "hired_at,terminated_at,expected_days",
    [
        (None, None, 30),  # full period, capped at 30
        (date(2026, 8, 1), None, 30),  # hired exactly on period start
        (None, date(2026, 8, 31), 30),  # terminated exactly on period end
        (date(2026, 9, 1), None, 0),  # hired after period ends -> 0 days
        (None, date(2026, 7, 31), 0),  # terminated before period starts -> 0 days
    ],
)
def test_edge_case_boundaries(hired_at, terminated_at, expected_days):
    staff = make_staff(hired_at=hired_at, terminated_at=terminated_at)
    result = compute_entry_for_staff(staff, PERIOD_START, PERIOD_END)

    assert result.working_days == expected_days
