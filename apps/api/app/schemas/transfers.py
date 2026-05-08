from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field


class StaffAssignment(BaseModel):
    id: UUID
    staff_id: UUID
    outlet_id: UUID
    role_id: str
    started_at: date
    ended_at: date | None = None
    transfer_reason: str | None = None
    approved_by_name: str | None = None
    is_approved: bool
    is_imported: bool
    created_at: datetime


class TransferRequest(BaseModel):
    """Request body for transferring a staff member to a new outlet/role."""

    new_outlet_id: UUID
    new_role_id: str
    effective_date: date
    transfer_reason: str = Field(..., min_length=3, max_length=500)
    approved_by_name: str | None = Field(None, max_length=200)
    is_approved: bool = True