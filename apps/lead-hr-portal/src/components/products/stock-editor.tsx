"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Warehouse, Check } from "lucide-react";
import { fetchProductStock, setProductStock } from "@/lib/api/products";
import { LoadingState, ErrorState } from "@/components/ui/states";

export function StockEditor({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savedRow, setSavedRow] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["product-stock-admin", productId],
    queryFn: () => fetchProductStock(productId),
  });

  useEffect(() => {
    if (query.data) {
      const initial: Record<string, string> = {};
      for (const row of query.data.stock) {
        initial[row.outlet_id] = String(row.quantity);
      }
      setDrafts(initial);
    }
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: ({ outletId, quantity }: { outletId: string; quantity: number }) =>
      setProductStock(productId, outletId, quantity),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["product-stock-admin", productId] });
      setSavedRow(variables.outletId);
      setTimeout(() => setSavedRow(null), 1500);
    },
  });

  if (query.isLoading) return <LoadingState label="Loading stock…" />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!query.data) return null;

  if (query.data.is_restaurant_item) {
    return (
      <p className="text-xs text-stone-500">
        Restaurant items are cooked to order and don&apos;t carry stock.
      </p>
    );
  }

  const rows = [...query.data.stock].sort((a, b) => {
    const aWarehouse = a.outlets?.is_warehouse ?? false;
    const bWarehouse = b.outlets?.is_warehouse ?? false;
    if (aWarehouse !== bWarehouse) return aWarehouse ? 1 : -1;
    return (a.outlets?.name ?? "").localeCompare(b.outlets?.name ?? "");
  });

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const isWarehouse = row.outlets?.is_warehouse ?? false;
        const draftValue = drafts[row.outlet_id] ?? String(row.quantity);
        const isDirty = draftValue !== String(row.quantity);
        return (
          <div
            key={row.outlet_id}
            className={`flex items-center justify-between gap-3 rounded-md border p-3 ${
              isWarehouse ? "border-stone-100 bg-stone-50" : "border-stone-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              {isWarehouse && <Warehouse className="h-4 w-4 text-stone-400" />}
              <div>
                <div className="text-sm font-medium text-black">
                  {row.outlets?.name ?? "Outlet"}
                </div>
                {row.outlets?.city && (
                  <div className="text-xs text-stone-500">{row.outlets.city}</div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={draftValue}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [row.outlet_id]: e.target.value }))
                }
                className="w-24 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-right text-sm focus:border-orange-700 focus:outline-none"
              />
              <button
                onClick={() =>
                  mutation.mutate({
                    outletId: row.outlet_id,
                    quantity: parseInt(draftValue, 10) || 0,
                  })
                }
                disabled={!isDirty || mutation.isPending}
                className="inline-flex items-center gap-1 rounded-md bg-stone-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-stone-800 disabled:opacity-40"
              >
                {savedRow === row.outlet_id ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        );
      })}
      {mutation.isError && (
        <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
      )}
    </div>
  );
}