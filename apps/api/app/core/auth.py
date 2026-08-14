"""HR portal authentication — validates a Supabase-issued JWT on protected
routes. No role tiers: any valid, non-expired session is fully authorized.
"""

from fastapi import Header, HTTPException
from supabase_auth.errors import AuthApiError

from app.core.db import get_supabase


def require_hr_user(authorization: str | None = Header(None)) -> str:
    """FastAPI dependency — raises 401 unless Authorization carries a valid
    Supabase session token. Returns the authenticated user's id.
    """
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

    return result.user.id
