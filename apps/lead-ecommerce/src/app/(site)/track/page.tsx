"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PackageSearch, XCircle } from "lucide-react";
import { trackOrder, cancelOrder } from "@/lib/api/orders";
import { OrderSummary } from "@/components/shop/order-summary";

const ACTIVE_STATUSES = new Set([
  "pending_payment",
  "payment_received",
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
]);

const CUSTOMER_CANCELLABLE_STATUSES = new Set([
  "pending_payment",
  "payment_received",
  "confirmed",
]);

export default function TrackOrderPage() {
  const qc = useQueryClient();
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

  const cancelMutation = useMutation({
    mutationFn: () => cancelOrder(submitted!.orderNumber, submitted!.email),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["track-order", submitted?.orderNumber, submitted?.email],
      });
    },
  });

  const result = query.data;
  const stillActive = result ? ACTIVE_STATUSES.has(result.order.status) : false;
  const canCancel = result ? CUSTOMER_CANCELLABLE_STATUSES.has(result.order.status) : false;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-center">
        <PackageSearch className="mx-auto h-12 w-12 text-orange-700" />
        <h1 className="mt-4 text-2xl font-bold text-black">Track your order</h1>
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
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-700 focus:outline-none"
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
            className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-700 focus:outline-none"
          />
        </div>
        {query.isError && (
          <p className="text-xs text-red-600">{(query.error as Error).message}</p>
        )}
        <button
          type="submit"
          disabled={query.isFetching}
          className="w-full rounded-md bg-orange-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50"
        >
          {query.isFetching ? "Looking up…" : "Track order"}
        </button>
      </form>

      {result && (
        <div className="mt-8">
          <div className="mb-4 text-center">
            <h2 className="text-lg font-semibold text-black">
              Order {result.order.order_number}
            </h2>
            {stillActive && (
              <p className="text-xs text-stone-500">
                This page updates automatically as your order progresses.
              </p>
            )}
          </div>
          <OrderSummary order={result.order} items={result.items} />

          {canCancel && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              {cancelMutation.isError && (
                <p className="mb-2 text-xs text-red-700">
                  {(cancelMutation.error as Error).message}
                </p>
              )}
              <button
                onClick={() => {
                  if (
                    confirm(
                      `Cancel order ${result.order.order_number}? This cannot be undone.`,
                    )
                  ) {
                    cancelMutation.mutate();
                  }
                }}
                disabled={cancelMutation.isPending}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                {cancelMutation.isPending ? "Cancelling…" : "Cancel this order"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
