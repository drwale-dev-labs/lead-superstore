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
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-100 via-orange-50 to-stone-50">
        {/* Decorative background blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-300/30 blur-3xl" />
          <div className="absolute -right-16 top-10 h-80 w-80 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-orange-200/30 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #000000 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-orange-700 ring-1 ring-orange-200">
              <Sparkles className="h-3 w-3" />
              Now serving Osogbo &amp; Ilesa
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-black sm:text-5xl">
              We have it <span className="text-orange-600">all!</span>
            </h1>
            <p className="mt-3 text-lg text-black">
              Everything you need, from one trusted store.
            </p>
            <p className="mt-3 text-base text-black/80">
              Lead Superstore brings supermarket, bakery, and restaurant under one roof.
              Shop online, pick up at your nearest outlet, or have it delivered.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/shop/supermarket"
                className="inline-flex items-center gap-2 rounded-md bg-orange-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-orange-700/20 transition-colors hover:bg-orange-800"
              >
                Start shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
              {outlet && (
                <span className="inline-flex items-center gap-1.5 text-xs text-stone-600">
                  <MapPin className="h-3.5 w-3.5" />
                  Picking up from <strong className="text-black">{outlet.name}</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Units */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-black">
          Three stores, one place
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {UNITS.map((u) => (
            <Link
              key={u.value}
              href={`/shop/${u.value.toLowerCase()}`}
              className="group rounded-xl border border-stone-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-lg"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-orange-100 text-orange-700">
                <Store className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-base font-semibold text-black">{u.label}</h3>
              <p className="mt-1 text-xs text-stone-500">{u.tagline}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-orange-700 group-hover:underline">
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
          <h2 className="text-xs font-semibold uppercase tracking-wider text-black">
            Featured this week
          </h2>
          <Link
            href="/shop/supermarket"
            className="text-xs font-medium text-orange-700 hover:underline"
          >
            View all →
          </Link>
        </div>

        {featuredQuery.isLoading && (
          <p className="text-sm text-stone-500">Loading featured products…</p>
        )}

        {featuredQuery.isError && (
          <p className="text-sm text-red-600">
            Couldn&apos;t load featured products right now — try refreshing.
          </p>
        )}

        {featuredQuery.data && featuredQuery.data.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredQuery.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {featuredQuery.data && featuredQuery.data.length === 0 && (
          <p className="text-sm text-stone-500">
            No featured products right now —{" "}
            <Link href="/shop/supermarket" className="text-orange-700 hover:underline">
              browse the full catalog
            </Link>
            .
          </p>
        )}

        {/* Categories quick links */}
        <div className="mt-12">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-black">
            Browse by category
          </h2>
          {categoriesQuery.data && (
            <div className="space-y-6">
              {UNITS.map((u) => {
                const cats = categoriesQuery.data!.filter((c) => c.unit === u.value);
                if (cats.length === 0) return null;
                return (
                  <div key={u.value}>
                    <h3 className="text-sm font-semibold text-black">{u.label}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cats.map((c) => (
                        <Link
                          key={c.id}
                          href={`/shop/${u.value.toLowerCase()}/${c.id}`}
                          className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-orange-300 hover:text-orange-700"
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