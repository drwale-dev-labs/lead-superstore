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
    """Structured fields for submitting an application (public, from e-commerce site).

    Submitted as multipart/form-data alongside optional file uploads (CV, cover
    letter, certificates), so this validates the text fields only.
    """

    job_posting_id: UUID
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)
    cover_letter: str | None = Field(None, max_length=5000)


class ApplicationUpdate(BaseModel):
    """Request body for HR to update an application's status.

    Moving to 'shortlisted' requires interview_scheduled_at + interview_location
    (an email is auto-sent). Moving to 'hired' requires resume_date (an email is
    auto-sent). Moving to 'rejected' auto-sends a rejection email.
    """

    status: str | None = Field(
        None, pattern="^(new|reviewing|shortlisted|interviewed|rejected|hired)$"
    )
    notes: str | None = None
    interview_scheduled_at: datetime | None = None
    interview_location: str | None = Field(None, max_length=300)
    resume_date: date | None = None


class InterviewScoreCreate(BaseModel):
    communication_score: int = Field(..., ge=1, le=5)
    role_knowledge_score: int = Field(..., ge=1, le=5)
    reliability_score: int = Field(..., ge=1, le=5)
    culture_fit_score: int = Field(..., ge=1, le=5)
    overall_comment: str | None = Field(None, max_length=2000)


class InterviewScore(InterviewScoreCreate):
    id: UUID
    application_id: UUID
    scored_at: datetime


class Application(BaseModel):
    id: UUID
    job_posting_id: UUID
    first_name: str
    last_name: str
    email: str
    phone: str
    resume_url: str | None = None
    cover_letter: str | None = None
    cv_path: str | None = None
    cv_filename: str | None = None
    cover_letter_path: str | None = None
    cover_letter_filename: str | None = None
    certificate_path: str | None = None
    certificate_filename: str | None = None
    nysc_certificate_path: str | None = None
    nysc_certificate_filename: str | None = None
    status: str
    notes: str | None = None
    interview_scheduled_at: datetime | None = None
    interview_location: str | None = None
    resume_date: date | None = None
    applied_at: datetime