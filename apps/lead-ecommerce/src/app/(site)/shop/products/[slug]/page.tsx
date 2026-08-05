"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle, ShoppingCart, Minus, Plus } from "lucide-react";
import { fetchProductBySlug, fetchProductStock } from "@/lib/api/shop";
import { StockAvailability } from "@/components/shop/stock-availability";
import { useOutlet } from "@/lib/outlet-context";
import { buildWhatsAppOrderLink } from "@/lib/whatsapp";
import { formatNaira } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { useRestaurantBasket } from "@/lib/restaurant-basket-context";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { outlet } = useOutlet();
  const { addItem, outletId: cartOutletId } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem: addToRestaurantBasket } = useRestaurantBasket();
  const [addedToBasket, setAddedToBasket] = useState(false);
 
  const productQuery = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });

  const stockQuery = useQuery({
    queryKey: ["product-stock", slug],
    queryFn: () => fetchProductStock(slug),
    enabled: !!productQuery.data,
  });

  if (productQuery.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-stone-500">
        Loading…
      </div>
    );
  }
  if (productQuery.isError || !productQuery.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Product not found.
        </div>
      </div>
    );
  }

  const product = productQuery.data;
  const unit = product.product_categories?.unit;
  const unitSlug = unit?.toLowerCase();

  const selectedOutletStock = stockQuery.data?.stock.find(
    (s) => s.outlet_id === outlet?.id,
  );
  const canAddToCart =
    !product.is_restaurant_item &&
    outlet &&
    selectedOutletStock &&
    selectedOutletStock.quantity > 0;
  const maxQty = selectedOutletStock?.quantity ?? 0;

  const whatsappLink = buildWhatsAppOrderLink({
    productName: product.name,
    price: Number(product.price),
    outletName: outlet?.name,
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={unitSlug ? `/shop/${unitSlug}` : "/shop"}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {unit ? `Back to ${unit}` : "Back to shop"}
      </Link>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-stone-400">
              No image available
            </div>
          )}
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-stone-500">
            {product.product_categories?.name ?? product.category_id}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{product.name}</h1>
          <div className="mt-3 text-2xl font-semibold text-amber-700">
            {formatNaira(Number(product.price))}
          </div>

          {product.description && (
            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              {product.description}
            </p>
          )}
            {product.is_restaurant_item ? (
              <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-5">
                <p className="text-sm text-orange-900">
                  This is a made-to-order dish. Add it to your order — you can pick several
                  dishes before sending everything to us on WhatsApp in one message.
                </p>
                <button
                  onClick={() => {
                    if (!outlet) return;
                    addToRestaurantBasket(product, outlet.id, 1);
                    setAddedToBasket(true);
                    setTimeout(() => setAddedToBasket(false), 2000);
                  }}
                  disabled={!outlet}
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-orange-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {!outlet ? "Choose an outlet first" : addedToBasket ? "Added ✓" : "Add to order"}
                </button>
                <p className="mt-2 text-[11px] text-orange-700">
                  Use the &quot;Order&quot; button in the header to review and send your full order.
                </p>
              </div>
            ) : (
            <>
              <div className="mt-6">
                <StockAvailability slug={slug} />
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center rounded-md border border-stone-300">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={!canAddToCart}
                    className="p-2 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(maxQty || 1, q + 1))}
                    disabled={!canAddToCart}
                    className="p-2 text-stone-600 hover:bg-stone-50 disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (!canAddToCart || !outlet) return;
                    addItem(product, quantity, outlet.id);
                    setAdded(true);
                    setTimeout(() => setAdded(false), 2000);
                  }}
                  disabled={!canAddToCart}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {!outlet
                    ? "Choose an outlet first"
                    : !selectedOutletStock || selectedOutletStock.quantity === 0
                      ? "Out of stock at your outlet"
                      : added
                        ? "Added ✓"
                        : "Add to cart"}
                </button>
              </div>
              {cartOutletId && outlet && cartOutletId !== outlet.id && (
                <p className="mt-2 text-[11px] text-orange-600">
                  Your cart has items from a different outlet. Adding this will start a
                  new cart for {outlet.name}.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}