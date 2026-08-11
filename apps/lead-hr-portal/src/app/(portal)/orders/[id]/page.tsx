"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Truck,
  Store,
  Save,
  CheckCircle2,
  XCircle,
  PackageCheck,
} from "lucide-react";
import { fetchOrderDetail, updateOrder } from "@/lib/api/orders";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { OrderStatusBadge } from "@/components/ui/order-status-badge";
import { formatNaira } from "@/lib/types";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const [notes, setNotes] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [feeInput, setFeeInput] = useState("");

  const query = useQuery({
    queryKey: ["order-detail", id],
    queryFn: () => fetchOrderDetail(id),
  });

  useEffect(() => {
    if (query.data && !notesDirty) {
      setNotes(query.data.order.staff_notes ?? "");
    }
    if (query.data) {
      setFeeInput(String(query.data.order.delivery_fee ?? 0));
    }
  }, [query.data, notesDirty]);

  const statusMut = useMutation({
    mutationFn: (status: Parameters<typeof updateOrder>[1]["status"]) =>
      updateOrder(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-detail", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const feeMut = useMutation({
    mutationFn: (fee: number) => updateOrder(id, { delivery_fee: fee }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-detail", id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const notesMut = useMutation({
    mutationFn: () => updateOrder(id, { staff_notes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order-detail", id] });
      setNotesDirty(false);
    },
  });

  if (query.isLoading) return <LoadingState label="Loading order…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!query.data) return <ErrorState message="Order not found" />;

  const { order, items } = query.data;
  const isDelivery = order.fulfillment_method === "delivery";

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All orders
      </Link>

      {/* Header */}
      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-stone-900">{order.order_number}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-600">
              <span>
                {order.customers?.first_name} {order.customers?.last_name}
              </span>
              <span className="text-stone-300">·</span>
              
              <a
                href={`mailto:${order.customers?.email}`}
                className="inline-flex items-center gap-1 hover:text-amber-700"
              >
                <Mail className="h-3 w-3" /> {order.customers?.email}
              </a>
              <span className="text-stone-300">·</span>
              
              <a
                href={`tel:${order.customers?.phone}`}
                className="inline-flex items-center gap-1 hover:text-amber-700"
              >
                <Phone className="h-3 w-3" /> {order.customers?.phone}
              </a>
            </div>
          </div>
          <OrderStatusBadge status={order.status} />
        </div>
      </header>

      {/* Items */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
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
          {isDelivery && (
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
      </section>

      {/* Fulfillment */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
          {isDelivery ? (
            <>
              <Truck className="h-3.5 w-3.5" /> Delivery
            </>
          ) : (
            <>
              <Store className="h-3.5 w-3.5" /> Pickup
            </>
          )}
        </h2>

        {isDelivery ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-stone-700">
              <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
              <span>
                {order.delivery_address}, {order.delivery_city}
              </span>
            </div>
            {order.delivery_notes && (
              <p className="pl-6 text-xs text-stone-500">{order.delivery_notes}</p>
            )}

            <div className="flex items-end gap-2 rounded-md bg-stone-50 p-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-stone-600">
                  Delivery fee override (₦)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={feeInput}
                  onChange={(e) => setFeeInput(e.target.value)}
                  className="w-full rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm focus:border-amber-700 focus:outline-none"
                />
              </div>
              <button
                onClick={() => feeMut.mutate(parseFloat(feeInput) || 0)}
                disabled={feeMut.isPending}
                className="rounded-md bg-stone-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {feeMut.isPending ? "Saving…" : "Save fee"}
              </button>
            </div>
            {feeMut.isError && (
              <p className="text-xs text-red-600">{(feeMut.error as Error).message}</p>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm text-stone-700">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-400" />
            <span>
              {order.outlets?.name}
              {order.outlets?.city ? `, ${order.outlets.city}` : ""}
            </span>
          </div>
        )}
      </section>

      {/* Pipeline actions */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          {order.status === "payment_received" && (
            <ActionButton
              icon={CheckCircle2}
              label="Confirm order"
              color="bg-amber-700 hover:bg-amber-800"
              onClick={() => statusMut.mutate("confirmed")}
              pending={statusMut.isPending}
            />
          )}

          {order.status === "confirmed" && !isDelivery && (
            <ActionButton
              icon={PackageCheck}
              label="Mark ready for pickup"
              color="bg-purple-700 hover:bg-purple-800"
              onClick={() => statusMut.mutate("ready_for_pickup")}
              pending={statusMut.isPending}
            />
          )}

          {order.status === "confirmed" && isDelivery && (
            <ActionButton
              icon={Truck}
              label="Mark out for delivery"
              color="bg-indigo-700 hover:bg-indigo-800"
              onClick={() => statusMut.mutate("out_for_delivery")}
              pending={statusMut.isPending}
            />
          )}

          {(order.status === "ready_for_pickup" || order.status === "out_for_delivery") && (
            <ActionButton
              icon={CheckCircle2}
              label="Mark completed"
              color="bg-green-700 hover:bg-green-800"
              onClick={() => statusMut.mutate("completed")}
              pending={statusMut.isPending}
            />
          )}

          {["payment_received", "confirmed", "ready_for_pickup", "out_for_delivery"].includes(
            order.status,
          ) && (
            <ActionButton
              icon={XCircle}
              label="Cancel order"
              color="bg-white border border-red-300 text-red-700 hover:bg-red-50"
              textOverride
              onClick={() => {
                if (confirm(`Cancel order ${order.order_number}?`)) {
                  statusMut.mutate("cancelled");
                }
              }}
              pending={statusMut.isPending}
            />
          )}
        </div>
        {statusMut.isError && (
          <p className="mt-3 text-xs text-red-600">{(statusMut.error as Error).message}</p>
        )}
      </section>

      {/* Staff notes */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Staff notes
        </h2>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setNotesDirty(true);
          }}
          rows={4}
          placeholder="Internal notes — delivery instructions given, follow-up needed, etc."
          className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none"
        />
        {notesMut.isError && (
          <p className="mt-2 text-xs text-red-600">{(notesMut.error as Error).message}</p>
        )}
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => notesMut.mutate()}
            disabled={!notesDirty || notesMut.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {notesMut.isPending ? "Saving…" : "Save notes"}
          </button>
        </div>
      </section>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  color,
  onClick,
  pending,
  textOverride,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  color: string;
  onClick: () => void;
  pending: boolean;
  textOverride?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium disabled:opacity-50 ${
        textOverride ? color : `text-white ${color}`
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}