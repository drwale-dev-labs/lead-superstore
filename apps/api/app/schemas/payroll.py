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
    net_pay: Decimal
    bank_name: str | None = None
    bank_account_number: str | None = None
    bank_account_name: str | None = None
    payment_status: str
    paid_at: datetime | None = None
    notes: str | None = None