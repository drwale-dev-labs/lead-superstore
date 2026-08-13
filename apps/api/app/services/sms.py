"""Termii integration for customer-facing SMS notifications."""

import httpx

from app.core.config import settings

TERMII_BASE_URL = "https://api.ng.termii.com/api/sms/send"


def _to_termii_format(phone: str) -> str:
    """Normalize a Nigerian phone number to international format (no leading +).

    Accepts local format (0801...) or already-international (234801... / +234801...).
    """
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("0"):
        return "234" + digits[1:]
    if digits.startswith("234"):
        return digits
    return digits


def _send_sms(to_phone: str, message: str) -> None:
    if not settings.TERMII_API_KEY:
        raise RuntimeError("TERMII_API_KEY is not configured")

    response = httpx.post(
        TERMII_BASE_URL,
        json={
            "api_key": settings.TERMII_API_KEY,
            "to": _to_termii_format(to_phone),
            "from": settings.TERMII_SENDER_ID,
            "sms": message,
            "type": "plain",
            "channel": "dnd",
        },
        timeout=15.0,
    )
    response.raise_for_status()
    body = response.json()
    if body.get("code") != "ok":
        raise RuntimeError(f"Termii rejected the message: {body}")


def send_order_confirmation_sms(
    *,
    to_phone: str,
    customer_name: str,
    order_number: str,
    total: float,
    fulfillment_method: str,
    outlet_name: str,
) -> None:
    """Notify a customer their payment was received and their order is confirmed."""
    next_step = (
        "We'll call you to confirm delivery."
        if fulfillment_method == "delivery"
        else "We'll text you once it's ready for pickup."
    )
    message = (
        f"Dear Customer, your order {order_number} has been confirmed. "
        f"₦{total:,.2f} received at {outlet_name}. {next_step} - Lead Superstore"
    )
    _send_sms(to_phone, message)


def send_order_completed_sms(
    *,
    to_phone: str,
    order_number: str,
    fulfillment_method: str,
    outlet_name: str,
) -> None:
    """Notify a customer their order has been delivered/picked up."""
    closing = (
        "delivered to you"
        if fulfillment_method == "delivery"
        else f"picked up at {outlet_name}"
    )
    message = (
        f"Dear Customer, your order {order_number} has been completed. "
        f"Your order was successfully {closing}. Thank you for shopping with us! "
        f"- Lead Superstore"
    )
    _send_sms(to_phone, message)
