import { CheckCircle2, CircleDot, Circle, XCircle, Truck, Store } from "lucide-react";
import type { OrderStatus } from "@/lib/types";

const PICKUP_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "confirmed", label: "Confirmed" },
  { status: "ready_for_pickup", label: "Ready for pickup" },
  { status: "completed", label: "Picked up" },
];

const DELIVERY_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "confirmed", label: "Confirmed" },
  { status: "out_for_delivery", label: "Out for delivery" },
  { status: "completed", label: "Delivered" },
];

export function OrderStatusTracker({
  status,
  fulfillmentMethod,
}: {
  status: OrderStatus;
  fulfillmentMethod: "pickup" | "delivery";
}) {
  if (status === "cancelled" || status === "refunded") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        {status === "cancelled" ? "This order was cancelled." : "This order was refunded."}
      </div>
    );
  }

  if (status === "pending_payment") {
    return null;
  }

  const steps = fulfillmentMethod === "pickup" ? PICKUP_STEPS : DELIVERY_STEPS;
  const currentIndex = steps.findIndex((s) => s.status === status);
  // payment_received sits before the first tracked step (confirmed)
  const activeIndex = currentIndex === -1 ? -1 : currentIndex;

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
        {fulfillmentMethod === "pickup" ? (
          <>
            <Store className="h-3.5 w-3.5" /> Order status
          </>
        ) : (
          <>
            <Truck className="h-3.5 w-3.5" /> Order status
          </>
        )}
      </h2>
      <ol className="space-y-4">
        {steps.map((step, i) => {
          const isComplete = status === "completed" || i < activeIndex;
          const isCurrent = !isComplete && i === activeIndex;
          return (
            <li key={step.status} className="flex items-center gap-3">
              {isComplete ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
              ) : isCurrent ? (
                <CircleDot className="h-5 w-5 flex-shrink-0 text-orange-700" />
              ) : (
                <Circle className="h-5 w-5 flex-shrink-0 text-stone-300" />
              )}
              <span
                className={
                  isComplete || isCurrent
                    ? "text-sm font-medium text-black"
                    : "text-sm text-stone-400"
                }
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
