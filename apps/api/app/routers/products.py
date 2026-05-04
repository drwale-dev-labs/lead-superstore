from fastapi import APIRouter, HTTPException, Query
from uuid import UUID

from app.core.db import get_supabase

router = APIRouter()


@router.get("/")
def list_products(
    category: str | None = Query(None),
    search: str | None = Query(None),
    in_stock_only: bool = Query(False),
):
    """List products. Public-facing — used by the e-commerce storefront."""
    supabase = get_supabase()
    query = supabase.table("products").select("*").eq("is_active", True)

    if category:
        query = query.eq("category", category)
    if search:
        query = query.ilike("name", f"%{search}%")
    if in_stock_only:
        query = query.gt("stock_qty", 0)

    response = query.order("category").order("name").execute()
    return {"count": len(response.data), "products": response.data}


@router.get("/{product_id}")
def get_product(product_id: UUID):
    """Get a single product."""
    supabase = get_supabase()
    response = (
        supabase.table("products")
        .select("*")
        .eq("id", str(product_id))
        .single()
        .execute()
    )

    if not response.data:
        raise HTTPException(status_code=404, detail="Product not found")

    return response.data