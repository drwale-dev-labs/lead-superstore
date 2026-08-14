import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.db import get_supabase
from app.schemas.orders import OrderAdminUpdate, OrderCreate, OrderTrackRequest
from app.services import sms
from app.services.notifications import claim_and_notify

logger = logging.getLogger(__name__)

# ============================================================================
# Public router — checkout + order lookup for the e-commerce app
# ============================================================================

public_router = APIRouter()


def _get_or_create_customer(supabase, info) -> str:
    """Find a customer by email (case-insensitive) or create one.

    If found, refresh their name/phone in case they changed it since last order.
    """
    existing = (
        supabase.table("customers").select("id").ilike("email", info.email).execute()
    )
    if existing.data:
        customer_id = existing.data[0]["id"]
        supabase.table("customers").update(
            {
                "first_name": info.first_name,
                "last_name": info.last_name,
                "phone": info.phone,
            }
        ).eq("id", customer_id).execute()
        return customer_id

    inserted = (
        supabase.table("customers")
        .insert(
            {
                "first_name": info.first_name,
                "last_name": info.last_name,
                "email": info.email,
                "phone": info.phone,
            }
        )
        .execute()
    )
    return inserted.data[0]["id"]


@public_router.post("/", status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate):
    """Create an order. Atomically validates and decrements stock.

    Restaurant items are rejected here — they must be ordered via WhatsApp,
    never through checkout.
    """
    supabase = get_supabase()

    outlet_check = (
        supabase.table("outlets")
        .select("id, is_active, is_warehouse")
        .eq("id", str(payload.fulfillment_outlet_id))
        .execute()
    )
    if not outlet_check.data:
        raise HTTPException(status_code=400, detail="Outlet not found")
    outlet = outlet_check.data[0]
    if not outlet["is_active"] or outlet["is_warehouse"]:
        raise HTTPException(
            status_code=400, detail="This outlet cannot fulfill customer orders"
        )

    customer_id = _get_or_create_customer(supabase, payload.customer)

    items_json = [
        {"product_id": str(item.product_id), "quantity": item.quantity}
        for item in payload.items
    ]

    try:
        rpc_result = supabase.rpc(
            "create_order",
            {
                "p_customer_id": customer_id,
                "p_outlet_id": str(payload.fulfillment_outlet_id),
                "p_fulfillment_method": payload.fulfillment_method,
                "p_delivery_address": payload.delivery_address,
                "p_delivery_city": payload.delivery_city,
                "p_delivery_notes": payload.delivery_notes,
                "p_items": items_json,
            },
        ).execute()
    except Exception as e:
        message = str(e)
        if "INSUFFICIENT_STOCK" in message:
            product_name = message.split("INSUFFICIENT_STOCK:")[-1].strip().strip("'\"")
            raise HTTPException(
                status_code=409,
                detail=f"Not enough stock for '{product_name}' at this outlet. Please reduce the quantity or choose a different outlet.",
            )
        if "RESTAURANT_ITEM_NOT_ORDERABLE" in message:
            raise HTTPException(
                status_code=400,
                detail="Restaurant items cannot be checked out — please order them via WhatsApp.",
            )
        if "PRODUCT_NOT_FOUND" in message:
            raise HTTPException(status_code=400, detail="One or more items no longer exist.")
        raise HTTPException(status_code=502, detail=f"Order could not be created: {message}")

    order_id = rpc_result.data

    order_resp = (
        supabase.table("orders")
        .select("*, outlets(name, city), customers(first_name, last_name, email, phone)")
        .eq("id", order_id)
        .single()
        .execute()
    )
    items_resp = (
        supabase.table("order_items").select("*").eq("order_id", order_id).execute()
    )

    return {"order": order_resp.data, "items": items_resp.data}


@public_router.post("/track")
def track_order(payload: OrderTrackRequest):
    """Look up an order by order number + email — no login required.

    The order number acts as a shared secret (same as most guest-checkout
    tracking flows): knowing a customer's email alone isn't enough to see
    their order history.
    """
    supabase = get_supabase()

    order_resp = (
        supabase.table("orders")
        .select(
            "*, outlets(name, city, phone), customers!inner(first_name, last_name, email, phone)"
        )
        .eq("order_number", payload.order_number)
        .ilike("customers.email", payload.email)
        .execute()
    )
    if not order_resp.data:
        raise HTTPException(
            status_code=404,
            detail="No order found with that order number and email. Please check and try again.",
        )

    order = order_resp.data[0]
    items_resp = (
        supabase.table("order_items").select("*").eq("order_id", order["id"]).execute()
    )

    return {"order": order, "items": items_resp.data}


@public_router.get("/{order_id}")
def get_order(order_id: UUID):
    """Fetch a single order with its items. Used by the confirmation page."""
    supabase = get_supabase()

    order_resp = (
        supabase.table("orders")
        .select("*, outlets(name, city, phone), customers(first_name, last_name, email, phone)")
        .eq("id", str(order_id))
        .execute()
    )
    if not order_resp.data:
        raise HTTPException(status_code=404, detail="Order not found")

    items_resp = (
        supabase.table("order_items").select("*").eq("order_id", str(order_id)).execute()
    )

    return {"order": order_resp.data[0], "items": items_resp.data}


# ============================================================================
# Admin router — HR portal order management
# ============================================================================

admin_router = APIRouter()


@admin_router.get("/")
def list_orders(
    status_filter: str | None = Query(None, alias="status"),
    outlet_id: UUID | None = Query(None),
    fulfillment_method: str | None = Query(None),
):
    """List orders for HR review, most recent first."""
    supabase = get_supabase()
    query = supabase.table("orders").select(
        "*, outlets(name, city), customers(first_name, last_name, email, phone)"
    )

    if status_filter:
        query = query.eq("status", status_filter)
    if outlet_id:
        query = query.eq("fulfillment_outlet_id", str(outlet_id))
    if fulfillment_method:
        query = query.eq("fulfillment_method", fulfillment_method)

    response = query.order("created_at", desc=True).execute()
    return {"count": len(response.data), "orders": response.data}


@admin_router.get("/{order_id}")
def get_order_admin(order_id: UUID):
    """Fetch a single order with items, for the HR order detail page."""
    supabase = get_supabase()

    order_resp = (
        supabase.table("orders")
        .select("*, outlets(name, city, phone), customers(first_name, last_name, email, phone)")
        .eq("id", str(order_id))
        .execute()
    )
    if not order_resp.data:
        raise HTTPException(status_code=404, detail="Order not found")

    items_resp = (
        supabase.table("order_items").select("*").eq("order_id", str(order_id)).execute()
    )

    return {"order": order_resp.data[0], "items": items_resp.data}


def _notify_order_completed(supabase, order: dict) -> None:
    """Send the order-completed SMS, at most once per order.

    Guards against a double-click on "Mark completed" triggering two texts
    via claim_and_notify's conditional-update claim.
    """

    def send(customer: dict, outlet: dict) -> None:
        sms.send_order_completed_sms(
            to_phone=customer["phone"],
            order_number=order["order_number"],
            fulfillment_method=order["fulfillment_method"],
            outlet_name=outlet.get("name", "Lead Superstore"),
        )

    claim_and_notify(supabase, order, "completion_sms_sent_at", send)


@admin_router.patch("/{order_id}")
def update_order(order_id: UUID, payload: OrderAdminUpdate):
    """Progress an order: change status, set delivery fee, or add staff notes.

    Setting delivery_fee recomputes total = subtotal + delivery_fee. Only valid
    for delivery orders.
    """
    supabase = get_supabase()

    existing = supabase.table("orders").select("*").eq("id", str(order_id)).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Order not found")
    order = existing.data[0]

    update_data: dict = {}

    if payload.delivery_fee is not None:
        if order["fulfillment_method"] != "delivery":
            raise HTTPException(
                status_code=400, detail="Delivery fee only applies to delivery orders"
            )
        update_data["delivery_fee"] = payload.delivery_fee
        update_data["total"] = (
            float(order["subtotal"]) + payload.delivery_fee + float(order["service_charge"])
        )

    if payload.status is not None:
        update_data["status"] = payload.status

    if payload.staff_notes is not None:
        update_data["staff_notes"] = payload.staff_notes

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    response = (
        supabase.table("orders").update(update_data).eq("id", str(order_id)).execute()
    )
    updated = response.data[0]

    if payload.status == "completed" and order["status"] != "completed":
        _notify_order_completed(supabase, updated)

    return updated