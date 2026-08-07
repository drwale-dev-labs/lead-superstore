"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, MapPin, Truck } from "lucide-react";
import { fetchOrders } from "@/lib/api/orders";
import { fetchOutlets } from "@/lib/api/outlets";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { OrderStatusBadge } from "@/components/ui/order-status-badge";
import { formatNaira } from "@/lib/types";
import type { OrderStatus } from "@/lib/types";

const STATUS_TABS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "payment_received", label: "Payment received" },
  { value: "confirmed", label: "Confirmed" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [outletId, setOutletId] = useState<string>("all");

  const outletsQuery = useQuery({ queryKey: ["outlets"], queryFn: fetchOutlets });

  const ordersQuery = useQuery({
    queryKey: ["orders", statusFilter, outletId],
    queryFn: () =>
      fetchOrders({
        status: statusFilter === "all" ? undefined : statusFilter,
        outlet_id: outletId === "all" ? undefined : outletId,
      }),
  });

  const allQuery = useQuery({ queryKey: ["orders", "all"], queryFn: () => fetchOrders() });

  const counts = useMemo(() => {
    if (!allQuery.data) return { all: 0 } as Record<string, number>;
    const result: Record<string, number> = { all: allQuery.data.length };
    for (const o of allQuery.data) {
      result[o.status] = (result[o.status] ?? 0) + 1;
    }
    return result;
  }, [allQuery.data]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Orders placed through the online store. Confirm, set delivery fees, and
        progress each order through fulfillment.
      </p>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.value;
            const count = counts[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-amber-700 bg-amber-700 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 ${isActive ? "text-amber-100" : "text-stone-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <select
          value={outletId}
          onChange={(e) => setOutletId(e.target.value)}
          className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs focus:border-amber-700 focus:outline-none"
        >
          <option value="all">All outlets</option>
          {outletsQuery.data
            ?.filter((o) => !o.is_warehouse)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
        </select>
      </div>

      {ordersQuery.isLoading && <LoadingState label="Loading orders…" />}
      {ordersQuery.isError && <ErrorState message={ordersQuery.error.message} />}

      {ordersQuery.data && ordersQuery.data.length === 0 && (
        <EmptyState
          title="No orders found"
          description="Orders will appear here as customers check out on the online store."
        />
      )}

      {ordersQuery.data && ordersQuery.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-left font-medium">Customer</th>
                <th className="px-4 py-3 text-left font-medium">Outlet</th>
                <th className="px-4 py-3 text-left font-medium">Fulfillment</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {ordersQuery.data.map((o) => (
                <tr key={o.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-medium text-stone-900 hover:text-amber-700"
                    >
                      {o.order_number}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                      <Package className="h-3 w-3" />
                      {new Date(o.created_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {o.customers?.first_name} {o.customers?.last_name}
                    <div className="text-xs text-stone-500">{o.customers?.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{o.outlets?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-stone-600">
                      {o.fulfillment_method === "delivery" ? (
                        <Truck className="h-3.5 w-3.5" />
                      ) : (
                        <MapPin className="h-3.5 w-3.5" />
                      )}
                      {o.fulfillment_method === "delivery" ? "Delivery" : "Pickup"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-900">
                    {formatNaira(Number(o.total))}
                  </td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}