"""HR portal authentication — validates a Supabase-issued JWT on protected
routes. No role tiers: any valid, non-expired session is fully authorized.
"""

from dataclasses import dataclass

from fastapi import Header, HTTPException
from supabase_auth.errors import AuthApiError

from app.core.db import get_supabase


@dataclass
class HRUser:
    id: str
    email: str | None
    full_name: str | None = None

    def display_name(self) -> str:
        """The string stamped onto orders/payroll/deductions/termination
        records to show who took the action — name if set, else email.
        """
        return self.full_name or self.email or self.id


def require_hr_user(authorization: str | None = Header(None)) -> str:
    """FastAPI dependency — raises 401 unless Authorization carries a valid
    Supabase session token. Returns the authenticated user's id.

    Kept returning a bare id (not HRUser) for backwards compatibility with
    existing callers that only need the id — see require_hr_user_full for
    routes that also need the email for attribution (who approved/confirmed
    a given action).
    """
    return _get_hr_user(authorization).id


def require_hr_user_full(authorization: str | None = Header(None)) -> HRUser:
    """Same as require_hr_user, but also returns the email — for stamping
    "who did this" onto orders, payroll approvals, terminations, and
    deductions, so a consequential action can always be traced back to the
    real logged-in account that took it.
    """
    return _get_hr_user(authorization)


def _get_hr_user(authorization: str | None) -> HRUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    supabase = get_supabase()
    try:
        result = supabase.auth.get_user(token)
    except AuthApiError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    if not result or not result.user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    full_name = (result.user.user_metadata or {}).get("full_name")
    return HRUser(id=result.user.id, email=result.user.email, full_name=full_name)
