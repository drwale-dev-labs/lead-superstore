from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class JobPosting(BaseModel):
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