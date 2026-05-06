from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ============================================================================
# References
# ============================================================================


class ReferenceCreate(BaseModel):
    reference_type: str = Field(
        ...,
        pattern="^(previous_employer|community_leader|religious_leader|other)$",
    )
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=7, max_length=20)
    email: EmailStr | None = None
    organization: str | None = Field(None, max_length=200)
    relationship: str = Field(..., min_length=3, max_length=300)
    note: str | None = Field(None, max_length=2000)


class Reference(ReferenceCreate):
    id: UUID
    staff_id: UUID
    document_path: str | None = None
    document_filename: str | None = None
    collected_at: datetime
    created_at: datetime


# ============================================================================
# Guarantors
# ============================================================================


class GuarantorCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str = Field(..., min_length=7, max_length=20)
    email: EmailStr | None = None
    address: str = Field(..., min_length=10, max_length=500)
    occupation: str = Field(..., min_length=2, max_length=200)
    relationship: str = Field(..., min_length=2, max_length=200)
    id_type: str | None = Field(
        None,
        pattern="^(NIN|BVN|voters_card|drivers_license|international_passport)$",
    )
    id_number: str | None = Field(None, max_length=50)
    note: str | None = Field(None, max_length=2000)


class Guarantor(GuarantorCreate):
    id: UUID
    staff_id: UUID
    document_path: str | None = None
    document_filename: str | None = None
    collected_at: datetime
    created_at: datetime