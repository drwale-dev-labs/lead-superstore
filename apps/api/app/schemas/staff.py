from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class Staff(BaseModel):
    id: UUID
    outlet_id: UUID | None = None
    role_id: str | None = None
    first_name: str
    last_name: str
    email: EmailStr | None = None
    phone: str | None = None
    status: str
    hired_at: date | None = None
    terminated_at: date | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime