from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# Salary structures
# ============================================================================


class SalaryStructureCreate(BaseModel):
    staff_id: UUID
    gross_salary: Decimal = Field(..., gt=0)
    effective_from: date
    notes: str | None = None


class SalaryStructure(BaseModel):
    id: UUID
    staff_id: UUID
    gross_salary: Decimal
    effective_from: date
    effective_to: date | None = None
    created_at: datetime


# ============================================================================
# Payroll periods
# ============================================================================


class PayrollPeriodCreate(BaseModel):
    outlet_id: UUID
    period_start: date
    period_end: date
    notes: str | None = None


class PayrollPeriod(BaseModel):
    id: UUID
    outlet_id: UUID
    period_start: date
    period_end: date
    status: str
    total_gross: Decimal
    total_net: Decimal
    notes: str | None = None
    approved_at: datetime | None = None
    created_at: datetime


# ============================================================================
# Payroll entries
# ============================================================================


class PayrollEntryUpdate(BaseModel):
    """HR can edit gross, working days, or deductions before approval."""

    gross_salary: Decimal | None = Field(None, gt=0)
    working_days: int | None = Field(None, ge=0, le=31)
    deductions: Decimal | None = Field(None, ge=0)
    notes: str | None = None


class PayrollEntry(BaseModel):
    id: UUID
    period_id: UUID
    staff_id: UUID
    gross_salary: Decimal
    working_days: int
    deductions: Decimal
    catch_up_pay: Decimal = Decimal("0")
    net_pay: Decimal
    bank_name: str | None = None
    bank_account_number: str | None = None
    bank_account_name: str | None = None
    payment_status: str
    paid_at: datetime | None = None
    notes: str | None = None


# ============================================================================
# Backdated catch-up (Phase 8b)
# ============================================================================


class BackdatedCandidate(BaseModel):
    """A staff member with a prior period they have no entry for."""

    staff_id: UUID
    staff_name: str
    missed_period_id: UUID
    missed_period_label: str
    days_owed: int
    estimated_amount: Decimal


class AddCatchUpRequest(BaseModel):
    """HR explicitly approving a catch-up for one staff/missed-period pair."""

    entry_id: UUID
    missed_period_id: UUID


class CatchUpItem(BaseModel):
    id: UUID
    entry_id: UUID
    staff_id: UUID
    missed_period_id: UUID
    days_owed: int
    amount: Decimal
    description: str | None = None
    created_at: datetime