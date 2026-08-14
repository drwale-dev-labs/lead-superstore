from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

from app.core.db import get_supabase

from app.schemas.products import ProductCreate, ProductUpdate, StockUpdate

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


@router.get("/by-ids")
def get_products_by_ids(ids: str = Query(..., description="Comma-separated product UUIDs")):
    """Look up multiple published products by id — used to rehydrate a past
    order's items with live current price/availability for reorder.
    """
    id_list = [i for i in ids.split(",") if i]
    if not id_list:
        return {"count": 0, "products": []}
    supabase = get_supabase()
    response = (
        supabase.table("products")
        .select("*, product_categories(name, unit)")
        .in_("id", id_list)
        .eq("is_published", True)
        .execute()
    )
    return {"count": len(response.data), "products": response.data}


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

# ============================================================================
# Admin — product management (HR portal)
# ============================================================================


@router.get("/admin/list")
def admin_list_products(
    category_id: str | None = Query(None),
    unit: str | None = Query(None),
    search: str | None = Query(None),
):
    """List ALL products for HR, including unpublished ones."""
    supabase = get_supabase()
    query = supabase.table("products").select("*, product_categories(name, unit)")

    if category_id:
        query = query.eq("category_id", category_id)
    if search:
        query = query.ilike("name", f"%{search}%")

    response = query.order("created_at", desc=True).execute()
    products = response.data

    if unit:
        products = [p for p in products if p.get("product_categories", {}).get("unit") == unit]

    return {"count": len(products), "products": products}


@router.get("/admin/{product_id}")
def admin_get_product(product_id: UUID):
    """Get a single product by id (not slug) for the admin edit page."""
    supabase = get_supabase()
    response = (
        supabase.table("products")
        .select("*, product_categories(name, unit)")
        .eq("id", str(product_id))
        .execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return response.data[0]


@router.post("/admin", status_code=201)
def admin_create_product(payload: ProductCreate):
    """Create a new product. Stock defaults to 0 at every non-warehouse outlet
    (skipped entirely for restaurant items, which don't carry stock)."""
    supabase = get_supabase()

    insert_data = payload.model_dump(mode="json", exclude_none=True)
    response = supabase.table("products").insert(insert_data).execute()
    product = response.data[0]

    if not payload.is_restaurant_item:
        outlets_resp = (
            supabase.table("outlets")
            .select("id")
            .eq("is_active", True)
            .eq("is_warehouse", False)
            .execute()
        )
        stock_rows = [
            {"product_id": product["id"], "outlet_id": o["id"], "quantity": 0}
            for o in outlets_resp.data
        ]
        if stock_rows:
            supabase.table("product_stock").insert(stock_rows).execute()

    return product


@router.patch("/admin/{product_id}")
def admin_update_product(product_id: UUID, payload: ProductUpdate):
    """Update a product's details, visibility, or featured status."""
    supabase = get_supabase()

    update_data = payload.model_dump(mode="json", exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["updated_at"] = "now()"

    response = (
        supabase.table("products").update(update_data).eq("id", str(product_id)).execute()
    )
    if not response.data:
        raise HTTPException(status_code=404, detail="Product not found")
    return response.data[0]


@router.get("/admin/{product_id}/stock")
def admin_get_product_stock(product_id: UUID):
    """Full per-outlet stock for a product, including warehouse (unlike the
    public endpoint, which hides the warehouse row)."""
    supabase = get_supabase()

    product_resp = (
        supabase.table("products")
        .select("id, name, is_restaurant_item")
        .eq("id", str(product_id))
        .execute()
    )
    if not product_resp.data:
        raise HTTPException(status_code=404, detail="Product not found")
    product = product_resp.data[0]

    if product["is_restaurant_item"]:
        return {"product_id": str(product_id), "is_restaurant_item": True, "stock": []}

    stock_resp = (
        supabase.table("product_stock")
        .select("outlet_id, quantity, updated_at, outlets(name, city, is_warehouse)")
        .eq("product_id", str(product_id))
        .execute()
    )

    return {
        "product_id": str(product_id),
        "is_restaurant_item": False,
        "stock": stock_resp.data,
    }


@router.put("/admin/{product_id}/stock")
def admin_set_stock(product_id: UUID, payload: StockUpdate):
    """Set the stock quantity for a product at one outlet.

    Upserts — creates the (product_id, outlet_id) row if it doesn't exist yet,
    otherwise updates the quantity.
    """
    supabase = get_supabase()

    product_resp = (
        supabase.table("products")
        .select("id, is_restaurant_item")
        .eq("id", str(product_id))
        .execute()
    )
    if not product_resp.data:
        raise HTTPException(status_code=404, detail="Product not found")
    if product_resp.data[0]["is_restaurant_item"]:
        raise HTTPException(
            status_code=400, detail="Restaurant items do not carry stock"
        )

    if payload.quantity < 0:
        raise HTTPException(status_code=400, detail="Quantity cannot be negative")

    existing = (
        supabase.table("product_stock")
        .select("product_id")
        .eq("product_id", str(product_id))
        .eq("outlet_id", str(payload.outlet_id))
        .execute()
    )

    if existing.data:
        response = (
            supabase.table("product_stock")
            .update({"quantity": payload.quantity, "updated_at": "now()"})
            .eq("product_id", str(product_id))
            .eq("outlet_id", str(payload.outlet_id))
            .execute()
        )
    else:
        response = (
            supabase.table("product_stock")
            .insert(
                {
                    "product_id": str(product_id),
                    "outlet_id": str(payload.outlet_id),
                    "quantity": payload.quantity,
                }
            )
            .execute()
        )

    return response.data[0]