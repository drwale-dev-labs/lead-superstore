from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class Outlet(BaseModel):
    id: UUID
    name: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    is_warehouse: bool = False
    is_active: bool = True
    created_at: datetime
    updated_at: datetime