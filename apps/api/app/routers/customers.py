from fastapi import APIRouter, Header, HTTPException, status

from app.core.db import get_supabase
from app.schemas.customers import RequestLoginCode, VerifyLoginCode
from app.services import customer_auth
from app.services import email as email_service

router = APIRouter()


@router.post("/request-code", status_code=status.HTTP_204_NO_CONTENT)
def request_login_code(payload: RequestLoginCode):
    """Email a one-time login code, if this email belongs to a customer.

    Always returns 204 regardless of whether the email is registered — this
    prevents the endpoint from being used to check which emails have placed
    orders with us.
    """
    supabase = get_supabase()
    existing = (
        supabase.table("customers")
        .select("id, email")
        .ilike("email", payload.email)
        .execute()
    )
    if existing.data:
        code = customer_auth.create_login_code(supabase, payload.email)
        try:
            email_service.send_login_code_email(to_email=payload.email, code=code)
        except Exception:
            # Don't leak send failures to the client — same reasoning as the
            # existence check above; a failed send looks identical to "no
            # account with this email" from the caller's perspective.
            pass


@router.post("/verify-code")
def verify_login_code(payload: VerifyLoginCode):
    """Exchange a valid one-time code for a 30-day session token."""
    supabase = get_supabase()

    row = customer_auth.verify_login_code(supabase, payload.email, payload.code)
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    customer = (
        supabase.table("customers")
        .select("id, first_name, last_name, email")
        .ilike("email", payload.email)
        .execute()
    )
    if not customer.data:
        raise HTTPException(status_code=404, detail="No account found for this email")

    token, expires_at = customer_auth.create_session(supabase, customer.data[0]["id"])
    return {
        "token": token,
        "expires_at": expires_at,
        "customer": customer.data[0],
    }


def _require_customer(supabase, authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.removeprefix("Bearer ").strip()
    customer_id = customer_auth.resolve_session(supabase, token)
    if not customer_id:
        raise HTTPException(status_code=401, detail="Session expired — please log in again")
    return customer_id


@router.get("/me/orders")
def list_my_orders(authorization: str | None = Header(None)):
    """List every order for the logged-in customer, most recent first."""
    supabase = get_supabase()
    customer_id = _require_customer(supabase, authorization)

    orders = (
        supabase.table("orders")
        .select("*, outlets(name, city)")
        .eq("customer_id", customer_id)
        .order("created_at", desc=True)
        .execute()
    )
    return {"count": len(orders.data), "orders": orders.data}


@router.get("/me/orders/{order_id}/items")
def get_my_order_items(order_id: str, authorization: str | None = Header(None)):
    """Items for one of the logged-in customer's own orders (for reorder)."""
    supabase = get_supabase()
    customer_id = _require_customer(supabase, authorization)

    order = (
        supabase.table("orders")
        .select("id, customer_id")
        .eq("id", order_id)
        .execute()
    )
    if not order.data or order.data[0]["customer_id"] != customer_id:
        raise HTTPException(status_code=404, detail="Order not found")

    items = (
        supabase.table("order_items").select("*").eq("order_id", order_id).execute()
    )
    return {"count": len(items.data), "items": items.data}
