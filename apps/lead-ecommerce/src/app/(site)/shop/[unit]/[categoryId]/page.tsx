"use client";

import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/lib/api/shop";
import { ProductCard } from "@/components/shop/product-card";
import type { Unit } from "@/lib/types";

const UNIT_LABELS: Record<string, Unit> = {
  supermarket: "Supermarket",
  bakery: "Bakery",
  restaurant: "Restaurant",
};

export default function CategoryPage({
  params,
}: {
  params: Promise<{ unit: string; categoryId: string }>;
}) {
  const { unit: unitSlug, categoryId } = use(params);
  const unit = UNIT_LABELS[unitSlug.toLowerCase()];

  const categoriesQuery = useQuery({
    queryKey: ["categories", unit],
    queryFn: () => fetchCategories(unit),
    enabled: !!unit,
  });

  const category = categoriesQuery.data?.find((c) => c.id === categoryId);

  const productsQuery = useQuery({
    queryKey: ["products", "category", categoryId],
    queryFn: () => fetchProducts({ category_id: categoryId }),
  });

  if (!unit) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-stone-600">Section not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href={`/shop/${unitSlug}`}
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All {unit.toLowerCase()}
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-stone-900">
          {category?.name ?? "Category"}
        </h1>
        {category?.description && (
          <p className="mt-1 text-sm text-stone-600">{category.description}</p>
        )}
      </header>

      <div className="mt-6">
        {productsQuery.isLoading && (
          <p className="text-sm text-stone-500">Loading products…</p>
        )}
        {productsQuery.data && productsQuery.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white px-8 py-16 text-center">
            <p className="text-sm text-stone-600">No products in this category yet.</p>
          </div>
        )}
        {productsQuery.data && productsQuery.data.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productsQuery.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}