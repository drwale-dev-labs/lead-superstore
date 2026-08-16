"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, UtensilsCrossed } from "lucide-react";
import { fetchCategories, fetchProducts } from "@/lib/api/shop";
import { ProductCard } from "@/components/shop/product-card";
import type { Unit } from "@/lib/types";
import { useRestaurantBasket } from "@/lib/restaurant-basket-context";
import { RestaurantBasketDrawer } from "@/components/shop/restaurant-basket-drawer";

const UNIT_LABELS: Record<string, Unit> = {
  supermarket: "Supermarket",
  bakery: "Bakery",
  restaurant: "Restaurant",
};

const UNIT_TAGLINES: Record<Unit, string> = {
  Supermarket: "Beverages, Bread and Snacks, Carbonated Drinks, Wines and Spirits, Groceries, Nigerian Foods, Household essentials, Toileteries, Insecticides and Washes, Diapers, Toys, Perfumes, Cosmetics, Shisha & Tobacco, and Fruits.", 
  Bakery: "Lead Superloaf, Whole Wheat Bread, Sardine Bread, Milk Bread, Chocolate Bread, Butter Bread, Animation Bread; Cakes - Big decoration cake, Cake (size 5), Cake (size 4), Cup cake by 5, Madera cake, Chocolate cake, Red velvet cake; and Pastries —Puff puff, Rough burns, Egg burns, Meat pie, Chicken pie, Fish pie, Sausage roll, Super roll, Chicken roll, Fish roll, Samosa, and Doughnuts — baked daily.",
  Restaurant: "Home-cooked meals, made to order and sent via WhatsApp.",
};

export default function UnitPage({
  params,
}: {
  params: Promise<{ unit: string }>;
}) {
  const { unit: unitSlug } = use(params);
  const unit = UNIT_LABELS[unitSlug.toLowerCase()];
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [basketOpen, setBasketOpen] = useState(false);
  const { itemCount } = useRestaurantBasket();

  const categoriesQuery = useQuery({
    queryKey: ["categories", unit],
    queryFn: () => fetchCategories(unit),
    enabled: !!unit,
  });

  const productsQuery = useQuery({
    queryKey: ["products", "unit", unit, categoryFilter],
    queryFn: () =>
      fetchProducts({
        unit,
        category_id: categoryFilter ?? undefined,
      }),
    enabled: !!unit,
  });

  if (!unit) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-sm text-stone-600">Section not found.</p>
        <Link href="/shop" className="mt-3 inline-block text-sm text-orange-700 hover:underline">
          Back to shop
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-black"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All departments
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold text-black">{unit}</h1>
        <p className="mt-1 text-sm text-stone-600">{UNIT_TAGLINES[unit]}</p>
        {unit === "Restaurant" && (
          <div className="mt-3 rounded-md border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
            Restaurant items are cooked to order and arranged directly over
            WhatsApp — they don&apos;t go through the cart.
          </div>
        )}
      </header>

      {/* Category filter pills */}
      {categoriesQuery.data && categoriesQuery.data.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === null
                ? "border-orange-700 bg-orange-700 text-white"
                : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
            }`}
          >
            All {unit.toLowerCase()}
          </button>
          {categoriesQuery.data.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                categoryFilter === c.id
                  ? "border-orange-700 bg-orange-700 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      <div className="mt-6">
        {productsQuery.isLoading && (
          <p className="text-sm text-stone-500">Loading products…</p>
        )}
        {productsQuery.data && productsQuery.data.length === 0 && (
          <div className="rounded-lg border border-dashed border-stone-300 bg-white px-8 py-16 text-center">
            <p className="text-sm text-stone-600">
              No products in this {categoryFilter ? "category" : "department"} yet.
            </p>
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

      {unit === "Restaurant" && itemCount > 0 && (
        <button
          onClick={() => setBasketOpen(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-green-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-green-700"
        >
          <UtensilsCrossed className="h-4 w-4" />
          View order ({itemCount})
        </button>
      )}

      <RestaurantBasketDrawer open={basketOpen} onClose={() => setBasketOpen(false)} />
    </div>
  );
}