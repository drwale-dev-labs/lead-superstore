import hashlib
import hmac
import json
import time
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, status

from app.core.config import settings
from app.core.db import get_supabase
from app.schemas.payments import (
    InitializePaymentRequest,
    InitializePaymentResponse,
    VerifyPaymentResponse,
)
from app.services import paystack

router = APIRouter()


@router.post("/initialize", response_model=InitializePaymentResponse)
def initialize_payment(payload: InitializePaymentRequest):
    """Start a Paystack transaction for an order's total.

    Only orders still in 'pending_payment' can be paid. `total` already
    includes subtotal + delivery fee (delivery orders only) + service charge,
    computed atomically at order creation.
    """
    supabase = get_supabase()

    order_resp = (
        supabase.table("orders")
        .select("*, customers(email)")
        .eq("id", str(payload.order_id))
        .execute()
    )
    if not order_resp.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = order_resp.data[0]

    if order["status"] != "pending_payment":
        raise HTTPException(
            status_code=400,
            detail=f"This order is '{order['status']}' and cannot be paid again.",
        )

    customer_email = (order.get("customers") or {}).get("email")
    if not customer_email:
        raise HTTPException(status_code=400, detail="Order has no customer email on file")

    # Reference must be unique per attempt so a retry after a failed payment works
    reference = f"{order['order_number']}-{int(time.time())}"
    callback_url = f"{settings.ECOMMERCE_URL}/payment/callback"

    try:
        result = paystack.initialize_transaction(
            email=customer_email,
            amount_naira=float(order["total"]),
            reference=reference,
            callback_url=callback_url,
            metadata={"order_id": str(order["id"]), "order_number": order["order_number"]},
        )
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    # Save the reference now so verification and the webhook can find this order
    supabase.table("orders").update({"payment_reference": reference}).eq(
        "id", str(order["id"])
    ).execute()

    return InitializePaymentResponse(
        authorization_url=result["authorization_url"],
        access_code=result["access_code"],
        reference=reference,
    )


@router.get("/verify/{reference}", response_model=VerifyPaymentResponse)
def verify_payment(reference: str):
    """Check a transaction reference against Paystack and update the order.

    Called from the callback page the customer lands on after paying.
    Idempotent — if the webhook already marked the order paid, this just
    reports success without calling Paystack again.
    """
    supabase = get_supabase()

    order_resp = (
        supabase.table("orders").select("*").eq("payment_reference", reference).execute()
    )
    if not order_resp.data:
        raise HTTPException(status_code=404, detail="No order found for this payment reference")
    order = order_resp.data[0]

    if order["status"] != "pending_payment":
        return VerifyPaymentResponse(
            status="success",
            order_id=order["id"],
            order_number=order["order_number"],
            amount=float(order["total"]),
        )

    try:
        result = paystack.verify_transaction(reference)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if result["status"] == "success":
        supabase.table("orders").update(
            {
                "status": "payment_received",
                "paid_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", order["id"]).execute()
        return VerifyPaymentResponse(
            status="success",
            order_id=order["id"],
            order_number=order["order_number"],
            amount=float(order["total"]),
        )

    return VerifyPaymentResponse(
        status="failed",
        order_id=order["id"],
        order_number=order["order_number"],
        amount=float(order["total"]),
    )


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def paystack_webhook(request: Request):
    """Paystack's server-to-server notification. The reliable source of truth,
    since the customer's browser callback can be interrupted (closed tab, lost
    connection) before verification runs.
    """
    if not settings.PAYSTACK_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Payments not configured")

    body = await request.body()
    signature = request.headers.get("x-paystack-signature", "")

    expected_signature = hmac.new(
        settings.PAYSTACK_SECRET_KEY.encode("utf-8"), body, hashlib.sha512
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = json.loads(body)

    if event.get("event") == "charge.success":
        reference = event["data"]["reference"]
        supabase = get_supabase()

        order_resp = (
            supabase.table("orders")
            .select("id, status")
            .eq("payment_reference", reference)
            .execute()
        )
        if order_resp.data and order_resp.data[0]["status"] == "pending_payment":
            supabase.table("orders").update(
                {
                    "status": "payment_received",
                    "paid_at": datetime.now(timezone.utc).isoformat(),
                }
            ).eq("id", order_resp.data[0]["id"]).execute()

    return {"received": True}