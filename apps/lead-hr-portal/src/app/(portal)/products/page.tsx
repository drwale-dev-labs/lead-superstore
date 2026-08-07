"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, EyeOff, Star } from "lucide-react";
import { fetchAdminProducts } from "@/lib/api/products";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/states";
import { formatNaira } from "@/lib/types";

type Unit = "Supermarket" | "Bakery" | "Restaurant";

const UNIT_TABS: { value: Unit | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Supermarket", label: "Supermarket" },
  { value: "Bakery", label: "Bakery" },
  { value: "Restaurant", label: "Restaurant" },
];

export default function ProductsPage() {
  const [unit, setUnit] = useState<Unit | "all">("all");
  const [search, setSearch] = useState("");

  const productsQuery = useQuery({
    queryKey: ["admin-products", unit, search],
    queryFn: () =>
      fetchAdminProducts({
        unit: unit === "all" ? undefined : unit,
        search: search || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-stone-600">
          Manage the online catalog — pricing, descriptions, visibility, and
          per-outlet stock levels.
        </p>
        <Link
          href="/products/new"
          className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
        >
          <Plus className="h-4 w-4" />
          New product
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {UNIT_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setUnit(tab.value)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                unit === tab.value
                  ? "border-amber-700 bg-amber-700 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-md border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-amber-700 focus:outline-none"
          />
        </div>
      </div>

      {productsQuery.isLoading && <LoadingState label="Loading products…" />}
      {productsQuery.isError && <ErrorState message={productsQuery.error.message} />}
      {productsQuery.data && productsQuery.data.length === 0 && (
        <EmptyState
          title="No products found"
          description="Try a different search or unit, or create a new product."
        />
      )}

      {productsQuery.data && productsQuery.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Product</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {productsQuery.data.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-medium text-stone-900 hover:text-amber-700"
                    >
                      {p.name}
                    </Link>
                    {p.sku && <div className="text-xs text-stone-500">{p.sku}</div>}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {p.product_categories?.name ?? p.category_id}
                    {p.product_categories?.unit && (
                      <div className="text-xs text-stone-500">
                        {p.product_categories.unit}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">
                    {formatNaira(Number(p.price))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!p.is_published && (
                        <span
                          title="Unpublished — hidden from customers"
                          className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-medium text-stone-700"
                        >
                          <EyeOff className="h-2.5 w-2.5" />
                          Hidden
                        </span>
                      )}
                      {p.is_featured && (
                        <span
                          title="Featured on homepage"
                          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800"
                        >
                          <Star className="h-2.5 w-2.5" />
                          Featured
                        </span>
                      )}
                      {p.is_restaurant_item && (
                        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-800">
                          Restaurant
                        </span>
                      )}
                    </div>
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