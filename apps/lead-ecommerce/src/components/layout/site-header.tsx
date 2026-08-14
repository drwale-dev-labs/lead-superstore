"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, PackageSearch, ShoppingBag, User, UtensilsCrossed } from "lucide-react";
import { useOutlet } from "@/lib/outlet-context";
import { OutletSelectorModal } from "@/components/shop/outlet-selector";
import { useCart } from "@/lib/cart-context";
import { useRestaurantBasket } from "@/lib/restaurant-basket-context";
import { useCustomerAuth } from "@/lib/customer-auth-context";
import { RestaurantBasketDrawer } from "@/components/shop/restaurant-basket-drawer";

export function SiteHeader() {
  const { outlet } = useOutlet();
  const { itemCount } = useCart();
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [restaurantBasketOpen, setRestaurantBasketOpen] = useState(false);
  const { itemCount: restaurantItemCount } = useRestaurantBasket();
  const { session } = useCustomerAuth();

  return (
    <>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex flex-col">
            <span className="text-base font-semibold text-amber-700">
              Lead Superstore
            </span>
            <span className="text-[10px] uppercase tracking-wider text-stone-400">
              Osun&apos;s favourite store
            </span>
          </Link>

          <div className="flex items-center gap-5 text-sm">
            <button
              onClick={() => setSelectorOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1.5 text-xs text-stone-700 hover:border-amber-300 hover:text-amber-700"
            >
              <MapPin className="h-3.5 w-3.5" />
              {outlet ? outlet.name : "Choose outlet"}
            </button>

            <Link href="/" className="text-stone-600 hover:text-amber-700">
              Shop
            </Link>

            <Link href="/careers" className="text-stone-600 hover:text-amber-700">
              Careers
            </Link>

            <Link
              href="/track"
              className="inline-flex items-center gap-1 text-stone-600 hover:text-amber-700"
            >
              <PackageSearch className="h-4 w-4" />
              Track order
            </Link>

            <Link
              href={session ? "/account/orders" : "/account/login"}
              className="inline-flex items-center gap-1 text-stone-600 hover:text-amber-700"
            >
              <User className="h-4 w-4" />
              {session ? "My orders" : "Sign in"}
            </Link>

            {restaurantItemCount > 0 && (
              <button
                onClick={() => setRestaurantBasketOpen(true)}
                className="relative inline-flex items-center gap-1 text-stone-600 hover:text-orange-700"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Order
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[9px] font-bold text-white">
                  {restaurantItemCount}
                </span>
              </button>
            )}

            <Link
              href="/cart"
              className="relative inline-flex items-center gap-1 text-stone-600 hover:text-amber-700"
            >
              <ShoppingBag className="h-4 w-4" />
              Cart
              {itemCount > 0 && (
                <span className="absolute -right-3 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-700 px-1 text-[9px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <OutletSelectorModal open={selectorOpen} onClose={() => setSelectorOpen(false)} />
      <RestaurantBasketDrawer
        open={restaurantBasketOpen}
        onClose={() => setRestaurantBasketOpen(false)}
      />
    </>
  );
}