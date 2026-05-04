from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class Product(BaseModel):
    id: UUID
    name: str
    category: str
    description: str | None = None
    price: float
    weight: str | None = None
    sku: str | None = None
    stock_qty: int = 0
    image_url: str | None = None
    badge: str | None = None
    is_active: bool = True
    created_at: datetime