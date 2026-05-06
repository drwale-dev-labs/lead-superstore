from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class StaffBase(BaseModel):
    """Shared fields between create, update, and response."""

    outlet_id: UUID | None = None
    role_id: str | None = None
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=20)
    notes: str | None = None
    bank_name: str | None = Field(None, max_length=100)
    bank_account_number: str | None = Field(None, min_length=10, max_length=10)
    bank_account_name: str | None = Field(None, max_length=200)


class StaffCreate(StaffBase):
    """Request body for creating a new staff member (onboarding)."""

    outlet_id: UUID
    role_id: str
    hired_at: date
    status: str = Field("onboarding", pattern="^(active|onboarding|inactive|terminated)$")


class StaffUpdate(BaseModel):
    """Request body for updating a staff member. All fields optional."""

    outlet_id: UUID | None = None
    role_id: str | None = None
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    phone: str | None = None
    status: str | None = Field(None, pattern="^(active|onboarding|inactive|terminated)$")
    hired_at: date | None = None
    terminated_at: date | None = None
    notes: str | None = None
    bank_name: str | None = Field(None, max_length=100)
    bank_account_number: str | None = Field(None, min_length=10, max_length=10)
    bank_account_name: str | None = Field(None, max_length=200)


class Staff(StaffBase):
    """Response model — what the API returns."""

    id: UUID
    status: str
    hired_at: date | None = None
    terminated_at: date | None = None
    created_at: datetime
    updated_at: datetime