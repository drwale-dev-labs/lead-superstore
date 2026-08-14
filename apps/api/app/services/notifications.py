"""Shared claim-then-notify helper for order status SMS.

Both a payment confirmation (payments.py) and an order completion
(orders.py) notification need the same idempotency shape: multiple
requests can independently observe the same status transition (e.g. the
browser callback and the Paystack webhook both see pending_payment ->
payment_received), so the "send" itself must be claimed via a conditional
update — only the request that successfully claims it actually sends.
A notification failure must never undo or block the status update that
already committed, so send failures are logged, not raised.
"""

import logging
from datetime import datetime, timezone
from typing import Callable

logger = logging.getLogger(__name__)


def claim_and_notify(
    supabase,
    order: dict,
    claim_column: str,
    send: Callable[[dict, dict], None],
) -> None:
    """Claim `claim_column` on this order (only succeeds if still null), then
    fetch the customer/outlet and call `send(customer, outlet)`.

    No-ops if the claim fails (another request already claimed it) or the
    customer has no phone on file. Send failures are logged, not raised.
    """
    claim = (
        supabase.table("orders")
        .update({claim_column: datetime.now(timezone.utc).isoformat()})
        .eq("id", order["id"])
        .is_(claim_column, "null")
        .execute()
    )
    if not claim.data:
        return  # another request already claimed/sent this notification

    customer_resp = (
        supabase.table("customers")
        .select("first_name, phone")
        .eq("id", order["customer_id"])
        .execute()
    )
    outlet_resp = (
        supabase.table("outlets")
        .select("name")
        .eq("id", order["fulfillment_outlet_id"])
        .execute()
    )
    customer = customer_resp.data[0] if customer_resp.data else {}
    outlet = outlet_resp.data[0] if outlet_resp.data else {}

    if not customer.get("phone"):
        return

    try:
        send(customer, outlet)
    except Exception:
        logger.exception(
            "Notification (%s) failed for order %s", claim_column, order["order_number"]
        )
