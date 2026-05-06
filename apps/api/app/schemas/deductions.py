from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# Loans
# ============================================================================


class LoanCreate(BaseModel):
    staff_id: UUID
    principal: Decimal = Field(..., gt=0)
    monthly_installment: Decimal = Field(..., gt=0)
    start_date: date
    notes: str | None = None


class LoanUpdate(BaseModel):
    monthly_installment: Decimal | None = Field(None, gt=0)
    status: str | None = Field(None, pattern="^(active|paid_off|cancelled)$")
    notes: str | None = None


class Loan(BaseModel):
    id: UUID
    staff_id: UUID
    principal: Decimal
    monthly_installment: Decimal
    balance: Decimal
    start_date: date
    status: str
    notes: str | None = None
    approved_at: datetime | None = None
    created_at: datetime


# ============================================================================
# Salary advances
# ============================================================================


class AdvanceCreate(BaseModel):
    staff_id: UUID
    amount: Decimal = Field(..., gt=0)
    reason: str | None = None


class AdvanceUpdate(BaseModel):
    status: str | None = Field(None, pattern="^(pending|applied|cancelled)$")
    reason: str | None = None


class Advance(BaseModel):
    id: UUID
    staff_id: UUID
    amount: Decimal
    reason: str | None = None
    status: str
    applied_to_period_id: UUID | None = None
    approved_at: datetime | None = None
    created_at: datetime


# ============================================================================
# Fines
# ============================================================================


class FineCreate(BaseModel):
    staff_id: UUID
    amount: Decimal = Field(..., gt=0)
    reason: str = Field(..., min_length=3, max_length=500)


class FineUpdate(BaseModel):
    status: str | None = Field(None, pattern="^(pending|approved|applied|cancelled)$")
    reason: str | None = None


class Fine(BaseModel):
    id: UUID
    staff_id: UUID
    amount: Decimal
    reason: str
    status: str
    applied_to_period_id: UUID | None = None
    approved_at: datetime | None = None
    created_at: datetime