import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, { label: string; classes: string }> = {
  pending_payment: { label: "Pending payment", classes: "bg-stone-200 text-stone-700" },
  payment_received: { label: "Payment received", classes: "bg-blue-100 text-blue-800" },
  confirmed: { label: "Confirmed", classes: "bg-amber-100 text-amber-800" },
  ready_for_pickup: { label: "Ready for pickup", classes: "bg-purple-100 text-purple-800" },
  out_for_delivery: { label: "Out for delivery", classes: "bg-indigo-100 text-indigo-800" },
  completed: { label: "Completed", classes: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelled", classes: "bg-red-100 text-red-700" },
  refunded: { label: "Refunded", classes: "bg-red-100 text-red-700" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${s.classes}`}
    >
      {s.label}
    </span>
  );
}