"use client";

import { MapPin, Check, Store } from "lucide-react";
import { useOutlet } from "@/lib/outlet-context";
import type { Outlet } from "@/lib/api/outlets";

export function OutletSelectorModal({
  open,
  onClose,
  required = false,
}: {
  open: boolean;
  onClose: () => void;
  required?: boolean;
}) {
  const { outlets, outlet: current, setOutlet, isLoading } = useOutlet();

  if (!open) return null;

  function pick(o: Outlet) {
    setOutlet(o);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <header className="border-b border-stone-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-black">
            <Store className="h-4 w-4 text-orange-700" />
            Choose your outlet
          </h2>
          <p className="mt-1 text-xs text-stone-600">
            Pick the Lead Superstore you&apos;ll pick up from, or have items delivered from.
            You can change this any time.
          </p>
        </header>

        <div className="p-4">
          {isLoading && <p className="p-4 text-sm text-stone-500">Loading outlets…</p>}
          <ul className="space-y-2">
            {outlets.map((o) => {
              const isCurrent = current?.id === o.id;
              return (
                <li key={o.id}>
                  <button
                    onClick={() => pick(o)}
                    className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                      isCurrent
                        ? "border-orange-700 bg-orange-50"
                        : "border-stone-200 hover:border-orange-300 hover:bg-orange-50/30"
                    }`}
                  >
                    <MapPin
                      className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                        isCurrent ? "text-orange-700" : "text-stone-400"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-black">{o.name}</div>
                      {o.city && (
                        <div className="text-xs text-stone-500">{o.city}</div>
                      )}
                    </div>
                    {isCurrent && (
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-700" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {!required && (
          <footer className="flex justify-end border-t border-stone-100 px-6 py-3">
            <button
              onClick={onClose}
              className="text-xs text-stone-500 hover:text-black"
            >
              Cancel
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}