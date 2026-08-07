from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class OrderItemCreate(BaseModel):
    product_id: UUID
    quantity: int = Field(..., gt=0, le=999)


class CustomerInfo(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., min_length=7, max_length=20)


class OrderCreate(BaseModel):
    customer: CustomerInfo
    fulfillment_outlet_id: UUID
    fulfillment_method: Literal["pickup", "delivery"]
    delivery_address: str | None = Field(None, max_length=500)
    delivery_city: str | None = Field(None, max_length=100)
    delivery_notes: str | None = Field(None, max_length=500)
    items: list[OrderItemCreate] = Field(..., min_length=1, max_length=50)

    @model_validator(mode="after")
    def check_delivery_address(self) -> "OrderCreate":
        if self.fulfillment_method == "delivery" and not self.delivery_address:
            raise ValueError("delivery_address is required when fulfillment_method is 'delivery'")
        if self.fulfillment_method == "pickup" and self.delivery_address:
            raise ValueError("delivery_address should not be set when fulfillment_method is 'pickup'")
        return self

class OrderAdminUpdate(BaseModel):
    status: Literal[
        "confirmed",
        "ready_for_pickup",
        "out_for_delivery",
        "completed",
        "cancelled",
        "refunded",
    ] | None = None
    delivery_fee: float | None = Field(None, ge=0)
    staff_notes: str | None = Field(None, max_length=1000)