"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Store, Sparkles, MapPin } from "lucide-react";
import { fetchProducts, fetchCategories } from "@/lib/api/shop";
import { useOutlet } from "@/lib/outlet-context";
import { OutletSelectorModal } from "@/components/shop/outlet-selector";
import { ProductCard } from "@/components/shop/product-card";
import { formatNaira } from "@/lib/types";
import type { Unit } from "@/lib/types";

const UNITS: { value: Unit; label: string; tagline: string }[] = [
  { value: "Supermarket", label: "Supermarket", tagline: "Beverages, Bread and Snacks, Carbonated Drinks, Wines and Spirits, Groceries, Nigerian Foods, Household essentials, Toileteries, Insecticides and Washes, Diapers, Toys, Perfumes, Cosmetics, Shisha & Tobacco, and Fruits." },
  { value: "Bakery", label: "Bakery", tagline: "Fresh bread, cakes, pastries — baked daily" },
  { value: "Restaurant", label: "Restaurant", tagline: "Home-cooked meals, made to order" },
];

export default function ShopHomePage() {
  const { outlet, isReady } = useOutlet();
  const [needsOutlet, setNeedsOutlet] = useState(false);

  // After the OutletProvider has hydrated, if no outlet is selected, pop the modal
  useEffect(() => {
    if (isReady && !outlet) {
      setNeedsOutlet(true);
    }
  }, [isReady, outlet]);

  const featuredQuery = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => fetchProducts({ featured: true }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-50 via-stone-50 to-white">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-800">
              <Sparkles className="h-3 w-3" />
              Now serving Osogbo &amp; Ilesa
            </p>
            <h1 className="mt-4 text-3xl font-bold text-stone-900 sm:text-4xl">
              Everything you need, from one trusted store — We've got it all.
            </h1>
            <p className="mt-3 text-base text-stone-600">
              Lead Superstore brings supermarket, bakery, and restaurant under one roof.
              Shop online, pick up at your nearest outlet, or have it delivered.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/shop/supermarket"
                className="inline-flex items-center gap-2 rounded-md bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800"
              >
                Start shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
              {outlet && (
                <span className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                  <MapPin className="h-3.5 w-3.5" />
                  Picking up from <strong className="text-stone-800">{outlet.name}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Units */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Three stores, one place
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {UNITS.map((u) => (
            <Link
              key={u.value}
              href={`/shop/${u.value.toLowerCase()}`}
              className="group rounded-lg border border-stone-200 bg-white p-6 transition-all hover:border-amber-300 hover:shadow-md"
            >
              <Store className="h-6 w-6 text-amber-700" />
              <h3 className="mt-3 text-base font-semibold text-stone-900">{u.label}</h3>
              <p className="mt-1 text-xs text-stone-500">{u.tagline}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-700 group-hover:underline">
                Browse {u.label.toLowerCase()}
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Featured this week
          </h2>
          <Link
            href="/shop/supermarket"
            className="text-xs font-medium text-amber-700 hover:underline"
          >
            View all →
          </Link>
        </div>

        {featuredQuery.isLoading && (
          <p className="text-sm text-stone-500">Loading featured products…</p>
        )}

        {featuredQuery.data && featuredQuery.data.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredQuery.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {/* Categories quick links */}
        <div className="mt-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-stone-500">
            Browse by category
          </h2>
          {categoriesQuery.data && (
            <div className="space-y-6">
              {UNITS.map((u) => {
                const cats = categoriesQuery.data!.filter((c) => c.unit === u.value);
                if (cats.length === 0) return null;
                return (
                  <div key={u.value}>
                    <h3 className="text-sm font-semibold text-stone-700">{u.label}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cats.map((c) => (
                        <Link
                          key={c.id}
                          href={`/shop/${u.value.toLowerCase()}/${c.id}`}
                          className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-amber-300 hover:text-amber-700"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <OutletSelectorModal
        open={needsOutlet}
        onClose={() => setNeedsOutlet(false)}
        required
      />
    </>
  );
}