from fastapi import APIRouter, HTTPException, Query

from app.core.db import get_supabase

router = APIRouter()


@router.get("/")
def list_roles(unit: str | None = Query(None, description="Filter by unit")):
    """List all active roles, optionally filtered by unit."""
    supabase = get_supabase()
    query = supabase.table("roles").select("*").eq("is_active", True)

    if unit:
        query = query.eq("unit", unit)

    response = query.order("unit").order("name").execute()
    return {"count": len(response.data), "roles": response.data}


@router.get("/{role_id}")
def get_role(role_id: str):
    """Get a single role by ID."""
    supabase = get_supabase()
    response = supabase.table("roles").select("*").eq("id", role_id).single().execute()

    if not response.data:
        raise HTTPException(status_code=404, detail=f"Role '{role_id}' not found")

    return response.data