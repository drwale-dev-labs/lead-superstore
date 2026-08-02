from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class ProductCategory(BaseModel):
    id: str
    name: str
    unit: str
    description: str | None = None
    display_order: int
    is_active: bool


class Product(BaseModel):
    id: UUID
    sku: str | None = None
    name: str
    slug: str
    category_id: str
    description: str | None = None
    price: float
    is_restaurant_item: bool
    image_url: str | None = None
    is_published: bool
    is_featured: bool
    created_at: datetime
    updated_at: datetime