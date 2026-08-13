"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { fetchOrder } from "@/lib/api/orders";
import { OrderSummary } from "@/components/shop/order-summary";

const ACTIVE_STATUSES = new Set([
  "pending_payment",
  "payment_received",
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
]);

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const query = useQuery({
    queryKey: ["order", id],
    queryFn: () => fetchOrder(id),
    // Keep polling while the order is still moving through the pipeline so
    // the customer sees status changes without manually refreshing.
    refetchInterval: (q) =>
      q.state.data && ACTIVE_STATUSES.has(q.state.data.order.status) ? 15_000 : false,
  });

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center text-sm text-stone-500">
        Loading your order…
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          We couldn&apos;t find this order.
        </div>
      </div>
    );
  }

  const { order } = query.data;

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
        <h1 className="mt-4 text-2xl font-bold text-stone-900">Order placed!</h1>
        <p className="mt-2 text-sm text-stone-600">
          Order <strong>{order.order_number}</strong> has been received.
        </p>
      </div>

      <div className="mt-8">
        <OrderSummary order={query.data.order} items={query.data.items} />
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/shop"
          className="inline-block text-sm font-medium text-amber-700 hover:underline"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}