"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatNaira, type Product } from "@/lib/types";
import { useOutlet } from "@/lib/outlet-context";
import { useCart } from "@/lib/cart-context";
import { useRestaurantBasket } from "@/lib/restaurant-basket-context";

export function ProductCard({ product }: { product: Product }) {
  const { outlet } = useOutlet();
  const { addItem } = useRestaurantBasket();
  const { addItem: addToCart, wouldReplaceCart } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div className="group relative rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300">
      <Link href={`/shop/products/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden rounded-md bg-stone-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
              No image
            </div>
          )}
        </div>
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">
            {product.product_categories?.name ?? product.category_id}
          </div>
          <div className="mt-0.5 line-clamp-2 text-sm font-medium text-stone-900 group-hover:text-amber-700">
            {product.name}
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-sm font-semibold text-stone-900">
              {formatNaira(Number(product.price))}
            </span>
            {product.is_restaurant_item && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-800">
                Restaurant
              </span>
            )}
          </div>
        </div>
      </Link>

      {product.is_restaurant_item ? (
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!outlet) return;
            addItem(product, outlet.id, 1);
          }}
          disabled={!outlet}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-800 hover:bg-orange-100 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add to order
        </button>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            if (!outlet) return;
            if (
              wouldReplaceCart(outlet.id) &&
              !confirm(
                "Your cart has items from a different outlet. Adding this will clear it and start a new cart here. Continue?",
              )
            ) {
              return;
            }
            addToCart(product, 1, outlet.id);
            setAdded(true);
            setTimeout(() => setAdded(false), 1500);
          }}
          disabled={!outlet}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {!outlet ? "Choose an outlet" : added ? "Added ✓" : "Add to cart"}
        </button>
      )}
    </div>
  );
}