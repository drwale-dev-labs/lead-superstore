"""HR portal account management — create/list/delete Supabase Auth users.

No public sign-up exists; this is the in-app replacement for creating
accounts via the Supabase Dashboard directly. Every route here is gated
behind require_hr_user (see main.py), so only an already-authenticated HR
user can manage accounts — there are no role tiers, any account can create
or remove any other.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_hr_user
from app.core.db import get_supabase
from app.schemas.accounts import CreateAccountRequest, ResetPasswordRequest

router = APIRouter()


@router.get("/")
def list_accounts():
    """List every HR portal account."""
    supabase = get_supabase()
    users = supabase.auth.admin.list_users()
    return {
        "count": len(users),
        "accounts": [
            {
                "id": u.id,
                "email": u.email,
                "created_at": u.created_at,
                "last_sign_in_at": u.last_sign_in_at,
            }
            for u in users
        ],
    }


@router.post("/", status_code=201)
def create_account(payload: CreateAccountRequest):
    """Create a new HR portal account with a temporary password.

    email_confirm=True skips Supabase's email-confirmation step — this
    account is being provisioned directly by another HR user, not signing
    up itself, so there's no confirmation email to send or wait on.
    """
    supabase = get_supabase()
    try:
        result = supabase.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
            }
        )
    except Exception as e:
        message = str(e)
        if "already been registered" in message or "already exists" in message:
            raise HTTPException(
                status_code=409, detail="An account with this email already exists"
            )
        raise HTTPException(status_code=400, detail=f"Could not create account: {message}")

    return {
        "id": result.user.id,
        "email": result.user.email,
        "created_at": result.user.created_at,
    }


@router.patch("/{account_id}/password", status_code=200)
def reset_password(account_id: str, payload: ResetPasswordRequest):
    """Set a new password for another HR portal account.

    For resetting someone else's forgotten password — a user changing
    their own password should use Supabase's client-side updateUser()
    with their own session instead, not this admin endpoint.
    """
    supabase = get_supabase()
    try:
        supabase.auth.admin.update_user_by_id(
            account_id, {"password": payload.password}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not reset password: {str(e)}")
    return {"reset": True}


@router.delete("/{account_id}", status_code=200)
def delete_account(account_id: str, current_user_id: str = Depends(require_hr_user)):
    """Remove an HR portal account.

    Refuses to let a user delete their own currently-logged-in account —
    there's no role hierarchy here, so this is the one built-in guardrail
    against someone accidentally locking themselves out. current_user_id
    comes from the caller's own validated JWT (via require_hr_user), never
    from client-supplied input, so this can't be bypassed by passing a
    different id.
    """
    if account_id == current_user_id:
        raise HTTPException(
            status_code=400, detail="You cannot delete your own account while logged in"
        )
    supabase = get_supabase()
    try:
        supabase.auth.admin.delete_user(account_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not delete account: {str(e)}")
    return {"deleted": True}
