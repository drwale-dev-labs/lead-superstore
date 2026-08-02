from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.core.db import get_supabase

router = APIRouter()


# ============================================================================
# Categories
# ============================================================================


@router.get("/categories")
def list_categories(unit: str | None = Query(None)):
    """List active product categories, optionally filtered by unit."""
    supabase = get_supabase()
    query = supabase.table("product_categories").select("*").eq("is_active", True)
    if unit:
        query = query.eq("unit", unit)
    response = query.order("display_order").execute()
    return {"count": len(response.data), "categories": response.data}


# ============================================================================
# Products
# ============================================================================


@router.get("/")
def list_products(
    category_id: str | None = Query(None),
    unit: str | None = Query(None),
    featured: bool | None = Query(None),
    search: str | None = Query(None),
):
    """List published products with optional filters."""
    supabase = get_supabase()
    query = (
        supabase.table("products")
        .select("*, product_categories(name, unit)")
        .eq("is_published", True)
    )

    if category_id:
        query = query.eq("category_id", category_id)
    if featured is not None:
        query = query.eq("is_featured", featured)
    if search:
        query = query.ilike("name", f"%{search}%")

    response = query.order("created_at", desc=True).execute()

    products = response.data

    # If a unit is requested, filter by joined category.unit
    if unit:
        products = [p for p in products if p.get("product_categories", {}).get("unit") == unit]

    return {"count": len(products), "products": products}


@router.get("/{slug}")
def get_product_by_slug(slug: str):
    """Look up a single product by its slug (used in URLs)."""
    supabase = get_supabase()
    response = (
        supabase.table("products")
        .select("*, product_categories(name, unit)")
        .eq("slug", slug)
        .eq("is_published", True)
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return response.data[0]


@router.get("/{slug}/stock")
def get_product_stock(slug: str):
    """Return per-outlet stock for a product.

    Restaurant items have no meaningful stock — returns an empty array with
    is_restaurant_item flag set so the frontend can show 'Order on WhatsApp'.
    """
    supabase = get_supabase()
    product_resp = (
        supabase.table("products")
        .select("id, is_restaurant_item, name")
        .eq("slug", slug)
        .execute()
    )
    if not product_resp.data:
        raise HTTPException(status_code=404, detail="Product not found")
    product = product_resp.data[0]

    if product["is_restaurant_item"]:
        return {
            "product_id": product["id"],
            "is_restaurant_item": True,
            "stock": [],
        }

    stock_resp = (
        supabase.table("product_stock")
        .select("outlet_id, quantity, outlets(name, city, is_warehouse)")
        .eq("product_id", product["id"])
        .execute()
    )

    # Exclude warehouse from customer-facing stock list
    stock = [
        s for s in stock_resp.data
        if not s.get("outlets", {}).get("is_warehouse", False)
    ]

    return {
        "product_id": product["id"],
        "is_restaurant_item": False,
        "stock": stock,
    }