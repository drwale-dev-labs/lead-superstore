"use client";

import { useQuery } from "@tanstack/react-query";
import { MapPin, Check, X } from "lucide-react";
import { fetchProductStock } from "@/lib/api/shop";
import { useOutlet } from "@/lib/outlet-context";

export function StockAvailability({ slug }: { slug: string }) {
  const { outlet: selectedOutlet } = useOutlet();

  const query = useQuery({
    queryKey: ["product-stock", slug],
    queryFn: () => fetchProductStock(slug),
  });

  if (query.isLoading) {
    return <p className="text-xs text-stone-500">Checking availability…</p>;
  }
  if (query.isError || !query.data) {
    return null;
  }

  if (query.data.is_restaurant_item) {
    // Restaurant items don't carry stock; nothing to render here —
    // the WhatsApp CTA on the page handles this case.
    return null;
  }

  const stock = query.data.stock;
  const selectedStock = stock.find((s) => s.outlet_id === selectedOutlet?.id);

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-500">
        <MapPin className="h-3.5 w-3.5" />
        Availability by outlet
      </h3>

      {selectedOutlet && (
        <div
          className={`mb-3 flex items-center justify-between rounded-md border p-3 text-sm ${
            selectedStock && selectedStock.quantity > 0
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <span className="font-medium text-stone-800">
            {selectedOutlet.name} <span className="text-xs text-stone-500">(your outlet)</span>
          </span>
          {selectedStock && selectedStock.quantity > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
              <Check className="h-3.5 w-3.5" />
              {selectedStock.quantity} in stock
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700">
              <X className="h-3.5 w-3.5" />
              Out of stock
            </span>
          )}
        </div>
      )}

      <ul className="space-y-1.5 text-xs">
        {stock
          .filter((s) => s.outlet_id !== selectedOutlet?.id)
          .map((s) => (
            <li
              key={s.outlet_id}
              className="flex items-center justify-between text-stone-600"
            >
              <span>{s.outlets?.name ?? "Outlet"}</span>
              {s.quantity > 0 ? (
                <span className="text-stone-500">{s.quantity} available</span>
              ) : (
                <span className="text-stone-400">Out of stock</span>
              )}
            </li>
          ))}
      </ul>
    </div>
  );
}