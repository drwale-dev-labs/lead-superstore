import { CheckCircle2, MapPin, Truck, Store, Phone } from "lucide-react";
import { formatNaira, type OrderDetail } from "@/lib/types";
import { PaymentButton } from "@/components/shop/payment-button";
import { OrderStatusTracker } from "@/components/shop/order-status-tracker";

export function OrderSummary({ order, items }: OrderDetail) {
  return (
    <>
      {/* Items */}
      <div className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Items
        </h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span className="text-stone-700">
                {item.product_name} × {item.quantity}
              </span>
              <span className="text-stone-900">{formatNaira(Number(item.line_total))}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
          <div className="flex justify-between text-stone-600">
            <span>Subtotal</span>
            <span>{formatNaira(Number(order.subtotal))}</span>
          </div>
          {order.fulfillment_method === "delivery" && (
            <div className="flex justify-between text-stone-600">
              <span>Delivery fee</span>
              <span>{formatNaira(Number(order.delivery_fee))}</span>
            </div>
          )}
          <div className="flex justify-between text-stone-600">
            <span>Service charge</span>
            <span>{formatNaira(Number(order.service_charge))}</span>
          </div>
          <div className="flex justify-between border-t border-stone-100 pt-1 font-semibold text-stone-900">
            <span>Total</span>
            <span>{formatNaira(Number(order.total))}</span>
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="mt-4 rounded-lg border border-stone-200 bg-white p-6">
        {order.status === "pending_payment" ? (
          <PaymentButton orderId={order.id} />
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4" />
            Payment received
            {order.paid_at ? ` — ${new Date(order.paid_at).toLocaleString()}` : ""}
          </div>
        )}
      </div>

      {/* Live status tracker */}
      {order.status !== "pending_payment" && (
        <div className="mt-4">
          <OrderStatusTracker status={order.status} fulfillmentMethod={order.fulfillment_method} />
        </div>
      )}

      {/* Pickup / delivery details */}
      <div className="mt-4 rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
          {order.fulfillment_method === "pickup" ? (
            <>
              <Store className="h-3.5 w-3.5" /> Pickup details
            </>
          ) : (
            <>
              <Truck className="h-3.5 w-3.5" /> Delivery details
            </>
          )}
        </h2>
        {order.fulfillment_method === "pickup" ? (
          <div className="flex items-start gap-2 text-sm text-stone-700">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
            <span>
              {order.outlets?.name}
              {order.outlets?.city ? `, ${order.outlets.city}` : ""}
            </span>
          </div>
        ) : (
          <div className="space-y-1 text-sm text-stone-700">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
              <span>
                {order.delivery_address}, {order.delivery_city}
              </span>
            </div>
            {order.delivery_notes && (
              <p className="pl-6 text-xs text-stone-500">{order.delivery_notes}</p>
            )}
          </div>
        )}
        {order.outlets?.phone && (
          <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
            <Phone className="h-3.5 w-3.5" />
            {order.outlets.name}: {order.outlets.phone}
          </div>
        )}
      </div>

      {/* What happens next */}
      <div className="mt-6 rounded-md border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800">
        <strong>What happens next:</strong> our team at {order.outlets?.name} will
        review your order
        {order.fulfillment_method === "delivery"
          ? " and call you to confirm the delivery schedule."
          : " and text or call you once it's ready for pickup."}{" "}
        {order.status === "pending_payment"
          ? "Complete payment above to confirm your order."
          : "Your payment has been received — we'll be in touch shortly."}
      </div>
    </>
  );
}
