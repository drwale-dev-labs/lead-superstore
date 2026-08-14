"""Passwordless email-code login for customers — order history + reorder.

Deliberately separate from the existing /track flow (order number + email):
this issues a real session so a customer can browse ALL their orders, which
/track intentionally never allows on email alone.
"""

import secrets
from datetime import datetime, timedelta, timezone

CODE_TTL_MINUTES = 10
SESSION_TTL_DAYS = 30


def generate_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def create_login_code(supabase, email: str) -> str:
    code = generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)
    supabase.table("customer_login_codes").insert(
        {
            "email": email.lower(),
            "code": code,
            "expires_at": expires_at.isoformat(),
        }
    ).execute()
    return code


def verify_login_code(supabase, email: str, code: str) -> dict | None:
    """Validate a code, mark it used, and return the matching row if valid."""
    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase.table("customer_login_codes")
        .select("*")
        .eq("email", email.lower())
        .eq("code", code)
        .is_("used_at", "null")
        .gte("expires_at", now)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not resp.data:
        return None

    row = resp.data[0]
    supabase.table("customer_login_codes").update(
        {"used_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", row["id"]).execute()
    return row


def create_session(supabase, customer_id: str) -> tuple[str, str]:
    token = generate_session_token()
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)
    supabase.table("customer_sessions").insert(
        {
            "token": token,
            "customer_id": customer_id,
            "expires_at": expires_at.isoformat(),
        }
    ).execute()
    return token, expires_at.isoformat()


def resolve_session(supabase, token: str) -> str | None:
    """Return the customer_id for a valid, unexpired session token, else None."""
    now = datetime.now(timezone.utc).isoformat()
    resp = (
        supabase.table("customer_sessions")
        .select("customer_id")
        .eq("token", token)
        .gte("expires_at", now)
        .limit(1)
        .execute()
    )
    if not resp.data:
        return None
    return resp.data[0]["customer_id"]
