from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ContractUpdate(BaseModel):
    content_html: str = Field(..., min_length=1)


class Contract(BaseModel):
    id: UUID
    staff_id: UUID
    content_html: str
    status: str
    generated_by: str | None = None
    generated_at: datetime
    sent_at: datetime | None = None
    pdf_path: str | None = None
    signed_copy_path: str | None = None
    signed_uploaded_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
