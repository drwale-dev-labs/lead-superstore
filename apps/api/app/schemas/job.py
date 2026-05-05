from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ============================================================================
# Job postings
# ============================================================================


class JobPostingCreate(BaseModel):
    """Request body for creating a job posting (HR side)."""

    role_id: str
    outlet_id: UUID
    title: str = Field(..., min_length=3, max_length=200)
    description: str | None = None
    requirements: list[str] | None = None
    employment_type: str = Field(
        "Full-time", pattern="^(Full-time|Part-time|Contract|Internship)$"
    )
    closes_at: date | None = None


class JobPostingUpdate(BaseModel):
    """Request body for updating a job posting."""

    title: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = None
    requirements: list[str] | None = None
    employment_type: str | None = Field(
        None, pattern="^(Full-time|Part-time|Contract|Internship)$"
    )
    closes_at: date | None = None


class JobPosting(BaseModel):
    """Response model."""

    id: UUID
    role_id: str | None = None
    outlet_id: UUID | None = None
    title: str
    description: str | None = None
    requirements: list[str] | None = None
    employment_type: str
    status: str
    published_at: datetime | None = None
    closes_at: date | None = None
    created_at: datetime


# ============================================================================
# Applications
# ============================================================================


class ApplicationCreate(BaseModel):
    """Request body for submitting an application (public, from e-commerce site)."""

    job_posting_id: UUID
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    resume_url: str | None = None
    cover_letter: str | None = Field(None, max_length=5000)


class ApplicationUpdate(BaseModel):
    """Request body for HR to update an application's status."""

    status: str | None = Field(
        None, pattern="^(new|reviewing|shortlisted|interviewed|rejected|hired)$"
    )
    notes: str | None = None


class Application(BaseModel):
    id: UUID
    job_posting_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str
    resume_url: str | None = None
    cover_letter: str | None = None
    status: str
    notes: str | None = None
    applied_at: datetime