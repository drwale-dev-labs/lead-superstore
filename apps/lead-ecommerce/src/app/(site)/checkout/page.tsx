"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Truck, Store } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useOutlet } from "@/lib/outlet-context";
import { createOrder } from "@/lib/api/orders";
import { formatNaira } from "@/lib/types";

const DELIVERY_FEE = 1150;
const SERVICE_CHARGE = 125;

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, outletId, clearCart } = useCart();
  const { outlets } = useOutlet();
  const cartOutlet = outlets.find((o) => o.id === outletId);

  const [method, setMethod] = useState<"pickup" | "delivery">("pickup");

  const mutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (result) => {
      clearCart();
      router.push(`/order-confirmation/${result.order.id}`);
    },
  });

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-stone-600">
          Your cart is empty — nothing to check out.
        </p>
        <Link href="/shop" className="mt-4 inline-block text-sm text-amber-700 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  if (!cartOutlet) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-sm text-red-600">
          We couldn&apos;t determine your fulfillment outlet. Please return to your
          cart and try again.
        </p>
        <Link href="/cart" className="mt-4 inline-block text-sm text-amber-700 hover:underline">
          Back to cart
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    mutation.mutate({
      customer: {
        first_name: form.get("first_name") as string,
        last_name: form.get("last_name") as string,
        email: form.get("email") as string,
        phone: form.get("phone") as string,
      },
      fulfillment_outlet_id: cartOutlet!.id,
      fulfillment_method: method,
      delivery_address:
        method === "delivery" ? (form.get("delivery_address") as string) : undefined,
      delivery_city:
        method === "delivery" ? (form.get("delivery_city") as string) : undefined,
      delivery_notes:
        method === "delivery"
          ? (form.get("delivery_notes") as string) || undefined
          : undefined,
      items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/cart"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to cart
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-stone-900">Checkout</h1>

      <form onSubmit={handleSubmit} className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Customer info */}
          <div className="rounded-lg border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">
              Your details
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" required>
                <input name="first_name" required className={inputCls} />
              </Field>
              <Field label="Last name" required>
                <input name="last_name" required className={inputCls} />
              </Field>
              <Field label="Email" required>
                <input name="email" type="email" required className={inputCls} />
              </Field>
              <Field label="Phone" required>
                <input
                  name="phone"
                  type="tel"
                  required
                  placeholder="08012345678"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>

          {/* Fulfillment */}
          <div className="rounded-lg border border-stone-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">
              Fulfillment
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("pickup")}
                className={`flex items-start gap-3 rounded-md border p-4 text-left transition-colors ${
                  method === "pickup"
                    ? "border-amber-700 bg-amber-50"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <Store
                  className={`mt-0.5 h-5 w-5 ${method === "pickup" ? "text-amber-700" : "text-stone-400"}`}
                />
                <div>
                  <div className="text-sm font-medium text-stone-900">Pickup</div>
                  <div className="mt-0.5 text-xs text-stone-500">
                    Collect from {cartOutlet.name}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMethod("delivery")}
                className={`flex items-start gap-3 rounded-md border p-4 text-left transition-colors ${
                  method === "delivery"
                    ? "border-amber-700 bg-amber-50"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <Truck
                  className={`mt-0.5 h-5 w-5 ${method === "delivery" ? "text-amber-700" : "text-stone-400"}`}
                />
                <div>
                  <div className="text-sm font-medium text-stone-900">Delivery</div>
                  <div className="mt-0.5 text-xs text-stone-500">
                    Flat {formatNaira(DELIVERY_FEE)} fee
                  </div>
                </div>
              </button>
            </div>

            {method === "pickup" && (
              <div className="mt-4 flex items-start gap-2 rounded-md bg-stone-50 p-3 text-xs text-stone-600">
                <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Pick up your order at <strong>{cartOutlet.name}</strong>
                  {cartOutlet.city ? `, ${cartOutlet.city}` : ""}. We&apos;ll notify
                  you by phone or email once it&apos;s ready.
                </span>
              </div>
            )}

            {method === "delivery" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                  A flat delivery fee of {formatNaira(DELIVERY_FEE)} applies — already
                  included in your total below. Our team at {cartOutlet.name} will call
                  you after your order is placed to confirm delivery timing.
                </div>
                <Field label="Delivery address" required>
                  <textarea
                    name="delivery_address"
                    required
                    rows={2}
                    placeholder="House no., street, area"
                    className={inputCls}
                  />
                </Field>
                <Field label="City" required>
                  <input
                    name="delivery_city"
                    required
                    placeholder="Osogbo"
                    className={inputCls}
                  />
                </Field>
                <Field label="Delivery notes (optional)">
                  <textarea
                    name="delivery_notes"
                    rows={2}
                    placeholder="Landmark, preferred time, gate code, etc."
                    className={inputCls}
                  />
                </Field>
              </div>
            )}
          </div>

          {mutation.isError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {(mutation.error as Error).message}
            </div>
          )}
        </div>

        {/* Order summary */}
        <aside className="rounded-lg border border-stone-200 bg-white p-6 lg:sticky lg:top-6 lg:h-fit">
          <h2 className="mb-4 text-sm font-semibold text-stone-800 border-b border-stone-100 pb-2">
            Order summary
          </h2>
          <ul className="space-y-2 text-xs">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex justify-between">
                <span className="text-stone-600">
                  {product.name} × {quantity}
                </span>
                <span className="text-stone-800">
                  {formatNaira(Number(product.price) * quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-stone-100 pt-3 text-sm">
            <div className="flex items-center justify-between text-stone-600">
              <span>Subtotal</span>
              <span>{formatNaira(subtotal)}</span>
            </div>
            {method === "delivery" && (
              <div className="flex items-center justify-between text-stone-600">
                <span>Delivery fee</span>
                <span>{formatNaira(DELIVERY_FEE)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-stone-600">
              <span>Service charge</span>
              <span>{formatNaira(SERVICE_CHARGE)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 pt-1 font-semibold text-stone-900">
              <span>Total</span>
              <span>
                {formatNaira(
                  subtotal + (method === "delivery" ? DELIVERY_FEE : 0) + SERVICE_CHARGE,
                )}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-5 w-full rounded-md bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {mutation.isPending ? "Placing order…" : "Place order"}
          </button>
          <p className="mt-2 text-center text-[11px] text-stone-500">
            Payment happens after order confirmation. No card required yet.
          </p>
        </aside>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}