from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.core.db import get_supabase
from app.schemas.orders import OrderCreate

router = APIRouter()


def _get_or_create_customer(supabase, info) -> str:
    """Find a customer by email (case-insensitive) or create one.

    If found, refresh their name/phone in case they changed it since last order.
    """
    existing = (
        supabase.table("customers")
        .select("id")
        .ilike("email", info.email)
        .execute()
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


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate):
    """Create an order. Atomically validates and decrements stock.

    Restaurant items are rejected here — they must be ordered via WhatsApp,
    never through checkout.
    """
    supabase = get_supabase()

    # Verify outlet exists and is a valid fulfillment outlet
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


@router.get("/{order_id}")
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
        supabase.table("order_items")
        .select("*")
        .eq("order_id", str(order_id))
        .execute()
    )

    return {"order": order_resp.data[0], "items": items_resp.data}