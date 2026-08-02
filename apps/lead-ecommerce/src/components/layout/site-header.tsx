"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, ShoppingBag } from "lucide-react";
import { useOutlet } from "@/lib/outlet-context";
import { OutletSelectorModal } from "@/components/shop/outlet-selector";

export function SiteHeader() {
  const { outlet } = useOutlet();
  const [selectorOpen, setSelectorOpen] = useState(false);

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
              href="/cart"
              className="inline-flex items-center gap-1 text-stone-600 hover:text-amber-700"
            >
              <ShoppingBag className="h-4 w-4" />
              Cart
            </Link>
          </div>
        </div>
      </header>

      <OutletSelectorModal
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
      />
    </>
  );
}