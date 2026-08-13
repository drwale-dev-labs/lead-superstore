"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PackageSearch } from "lucide-react";
import { trackOrder } from "@/lib/api/orders";
import { OrderSummary } from "@/components/shop/order-summary";

const ACTIVE_STATUSES = new Set([
  "pending_payment",
  "payment_received",
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
]);

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<{ orderNumber: string; email: string } | null>(
    null,
  );

  const query = useQuery({
    queryKey: ["track-order", submitted?.orderNumber, submitted?.email],
    queryFn: () => trackOrder(submitted!.orderNumber, submitted!.email),
    enabled: !!submitted,
    retry: false,
    // Keep polling while the order is still moving through the pipeline so
    // the customer sees status changes without re-submitting the form.
    refetchInterval: (q) =>
      q.state.data && ACTIVE_STATUSES.has(q.state.data.order.status) ? 15_000 : false,
  });

  const result = query.data;
  const stillActive = result ? ACTIVE_STATUSES.has(result.order.status) : false;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-center">
        <PackageSearch className="mx-auto h-12 w-12 text-amber-700" />
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Track your order</h1>
        <p className="mt-2 text-sm text-stone-600">
          Enter your order number and the email you used at checkout.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted({ orderNumber: orderNumber.trim(), email: email.trim() });
        }}
        className="mt-8 space-y-4 rounded-lg border border-stone-200 bg-white p-6"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">
            Order number
          </label>
          <input
            type="text"
            required
            placeholder="LS-2026-00001"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-600">Email</label>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
          />
        </div>
        {query.isError && (
          <p className="text-xs text-red-600">{(query.error as Error).message}</p>
        )}
        <button
          type="submit"
          disabled={query.isFetching}
          className="w-full rounded-md bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
        >
          {query.isFetching ? "Looking up…" : "Track order"}
        </button>
      </form>

      {result && (
        <div className="mt-8">
          <div className="mb-4 text-center">
            <h2 className="text-lg font-semibold text-stone-900">
              Order {result.order.order_number}
            </h2>
            {stillActive && (
              <p className="text-xs text-stone-500">
                This page updates automatically as your order progresses.
              </p>
            )}
          </div>
          <OrderSummary order={result.order} items={result.items} />
        </div>
      )}
    </div>
  );
}
