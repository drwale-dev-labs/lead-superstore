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

class ProductCreate(BaseModel):
    sku: str | None = None
    name: str
    slug: str
    category_id: str
    description: str | None = None
    price: float
    is_restaurant_item: bool = False
    image_url: str | None = None
    is_published: bool = True
    is_featured: bool = False

class ProductUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    slug: str | None = None
    category_id: str | None = None
    description: str | None = None
    price: float | None = None
    is_restaurant_item: bool | None = None
    image_url: str | None = None
    is_published: bool | None = None
    is_featured: bool | None = None


class StockUpdate(BaseModel):
    outlet_id: UUID
    quantity: int