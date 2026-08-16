"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Package, RotateCcw, LogOut } from "lucide-react";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { fetchMyOrders, fetchMyOrderItems, type MyOrder } from "@/lib/api/customers";
import { fetchProductsByIds } from "@/lib/api/shop";
import { useCart } from "@/lib/cart-context";
import { formatNaira } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  payment_received: "Payment received",
  confirmed: "Confirmed",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default function AccountOrdersPage() {
  const router = useRouter();
  const { session, isReady, logout } = useCustomerAuth();
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    if (isReady && !session) {
      router.replace("/account/login");
    }
  }, [isReady, session, router]);

  const ordersQuery = useQuery({
    queryKey: ["my-orders"],
    queryFn: fetchMyOrders,
    enabled: !!session,
  });

  const reorderMut = useMutation({
    mutationFn: async (order: MyOrder) => {
      const items = await fetchMyOrderItems(order.id);
      const productIds = items.map((i) => i.product_id);
      const products = await fetchProductsByIds(productIds);
      return { items, products, order };
    },
    onMutate: (order) => {
      setReorderingId(order.id);
      setReorderError(null);
    },
    onSuccess: ({ items, products, order }) => {
      // Reorder into the order's original outlet — this correctly resets the
      // cart if it currently holds items from a different outlet (same
      // behavior as adding any item from a different outlet elsewhere).
      const targetOutletId = order.fulfillment_outlet_id;
      let addedCount = 0;
      const unavailable: string[] = [];
      for (const item of items) {
        const product = products.find((p) => p.id === item.product_id);
        if (product) {
          addItem(product, item.quantity, targetOutletId);
          addedCount++;
        } else {
          unavailable.push(item.product_name);
        }
      }
      if (addedCount === 0) {
        setReorderError(
          "None of the items in this order are available anymore — they may have been discontinued.",
        );
        return;
      }
      if (unavailable.length > 0) {
        setReorderError(
          `Added ${addedCount} item${addedCount === 1 ? "" : "s"} to your cart. ${unavailable.join(", ")} ${unavailable.length === 1 ? "is" : "are"} no longer available and ${unavailable.length === 1 ? "was" : "were"} skipped.`,
        );
        return;
      }
      router.push("/cart");
    },
    onSettled: () => setReorderingId(null),
  });

  if (!isReady || !session) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-stone-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black">Your orders</h1>
          <p className="mt-1 text-sm text-stone-600">
            Signed in as {session.customer.email}
          </p>
        </div>
        <button
          onClick={() => {
            logout();
            router.push("/shop");
          }}
          className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-black"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>

      {ordersQuery.isLoading && (
        <p className="mt-8 text-sm text-stone-500">Loading your orders…</p>
      )}
      {ordersQuery.isError && (
        <p className="mt-8 text-sm text-red-600">{(ordersQuery.error as Error).message}</p>
      )}

      {reorderError && (
        <div className="mt-6 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
          {reorderError}{" "}
          <Link href="/cart" className="font-medium underline">
            Go to cart
          </Link>
        </div>
      )}

      {ordersQuery.data && ordersQuery.data.length === 0 && (
        <div className="mt-12 text-center">
          <Package className="mx-auto h-12 w-12 text-stone-300" />
          <p className="mt-4 text-sm text-stone-600">You haven't placed an order yet.</p>
          <Link
            href="/shop"
            className="mt-4 inline-block text-sm font-medium text-orange-700 hover:underline"
          >
            Start shopping
          </Link>
        </div>
      )}

      {ordersQuery.data && ordersQuery.data.length > 0 && (
        <ul className="mt-8 space-y-3">
          {ordersQuery.data.map((order) => {
            const canReorder = !["pending_payment", "cancelled", "refunded"].includes(
              order.status,
            );
            return (
              <li
                key={order.id}
                className="rounded-lg border border-stone-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-black">
                        {order.order_number}
                      </span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stone-600">
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {new Date(order.created_at).toLocaleDateString("en-NG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                      {order.outlets ? ` · ${order.outlets.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-black">
                      {formatNaira(Number(order.total))}
                    </div>
                    {canReorder && (
                      <button
                        onClick={() => reorderMut.mutate(order)}
                        disabled={reorderingId === order.id}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-800 hover:bg-orange-100 disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {reorderingId === order.id ? "Adding…" : "Reorder"}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
