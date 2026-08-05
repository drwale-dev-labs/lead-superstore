from uuid import UUID

from pydantic import BaseModel


class InitializePaymentRequest(BaseModel):
    order_id: UUID


class InitializePaymentResponse(BaseModel):
    authorization_url: str
    access_code: str
    reference: str


class VerifyPaymentResponse(BaseModel):
    status: str  # "success" | "failed"
    order_id: UUID
    order_number: str
    amount: float