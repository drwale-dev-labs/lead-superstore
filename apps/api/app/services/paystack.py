"""Thin wrapper around the Paystack Transactions API.

All amounts Paystack expects are in kobo (subunit), so every naira amount
passed in here gets multiplied by 100 before the request goes out.
"""

import httpx

from app.core.config import settings

PAYSTACK_BASE_URL = "https://api.paystack.co"


def _headers() -> dict:
    if not settings.PAYSTACK_SECRET_KEY:
        raise RuntimeError("PAYSTACK_SECRET_KEY is not configured")
    return {
        "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        "Content-Type": "application/json",
    }

def initialize_transaction(
    *, email: str, amount_naira: float, reference: str, callback_url: str, metadata: dict
) -> dict:
    """Start a Paystack transaction. Returns authorization_url, access_code, reference."""
    payload = {
        "email": email,
        "amount": int(round(amount_naira * 100)),
        "reference": reference,
        "callback_url": callback_url,
        "metadata": metadata,
        "channels": ["card", "bank_transfer"],
    }
    with httpx.Client(timeout=15.0) as client:
        resp = client.post(
            f"{PAYSTACK_BASE_URL}/transaction/initialize",
            headers=_headers(),
            json=payload,
        )
    data = resp.json()
    if not data.get("status"):
        raise RuntimeError(data.get("message", "Failed to initialize transaction"))
    return data["data"]

def verify_transaction(reference: str) -> dict:
    """Ask Paystack for the current status of a transaction reference."""
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(
            f"{PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers=_headers(),
        )
    data = resp.json()
    if not data.get("status"):
        raise RuntimeError(data.get("message", "Failed to verify transaction"))
    return data["data"]