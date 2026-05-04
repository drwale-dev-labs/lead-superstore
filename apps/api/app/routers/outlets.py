from fastapi import APIRouter, HTTPException

from app.core.db import get_supabase

router = APIRouter()


@router.get("/")
def list_outlets():
    """List all active outlets."""
    supabase = get_supabase()
    response = (
        supabase.table("outlets")
        .select("*")
        .eq("is_active", True)
        .order("name")
        .execute()
    )

    if response.data is None:
        raise HTTPException(status_code=500, detail="Failed to fetch outlets")

    return {"count": len(response.data), "outlets": response.data}