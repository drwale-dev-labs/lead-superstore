"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useOutlet } from "@/lib/outlet-context";
import { formatNaira } from "@/lib/types";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal, outletId } = useCart();
  const { outlets } = useOutlet();
  const router = useRouter();

  const cartOutlet = outlets.find((o) => o.id === outletId);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-stone-300" />
        <h1 className="mt-4 text-xl font-semibold text-stone-900">
          Your cart is empty
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Browse our departments and add items to get started.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800"
        >
          Start shopping
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-bold text-stone-900">Your cart</h1>
      {cartOutlet && (
        <p className="mt-1 text-sm text-stone-600">
          Items reserved from <strong>{cartOutlet.name}</strong>
        </p>
      )}

      <div className="mt-6 space-y-3">
        {items.map(({ product, quantity }) => (
          <div
            key={product.id}
            className="flex items-center gap-4 rounded-lg border border-stone-200 bg-white p-4"
          >
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-stone-100">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[9px] text-stone-400">
                  No image
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Link
                href={`/shop/products/${product.slug}`}
                className="text-sm font-medium text-stone-900 hover:text-amber-700"
              >
                {product.name}
              </Link>
              <div className="mt-0.5 text-xs text-stone-500">
                {formatNaira(Number(product.price))} each
              </div>
            </div>

            <div className="flex items-center rounded-md border border-stone-300">
              <button
                onClick={() => updateQuantity(product.id, quantity - 1)}
                className="p-2 text-stone-600 hover:bg-stone-50"
                aria-label="Decrease quantity"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm font-medium">
                {quantity}
              </span>
              <button
                onClick={() => updateQuantity(product.id, quantity + 1)}
                className="p-2 text-stone-600 hover:bg-stone-50"
                aria-label="Increase quantity"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="w-24 text-right text-sm font-semibold text-stone-900">
              {formatNaira(Number(product.price) * quantity)}
            </div>

            <button
              onClick={() => removeItem(product.id)}
              className="p-2 text-stone-400 hover:text-red-600"
              aria-label="Remove item"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-stone-600">Subtotal</span>
          <span className="font-semibold text-stone-900">
            {formatNaira(subtotal)}
          </span>
        </div>
        <p className="mt-1 text-xs text-stone-500">
          Delivery fee (if applicable) will be confirmed by the outlet after checkout.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Continue shopping
          </Link>
          <button
            onClick={() => router.push("/checkout")}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-amber-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-800"
          >
            Proceed to checkout
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}