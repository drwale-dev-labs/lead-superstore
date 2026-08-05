"use client";

import { X, Minus, Plus, Trash2, MessageCircle, UtensilsCrossed } from "lucide-react";
import { useRestaurantBasket } from "@/lib/restaurant-basket-context";
import { useOutlet } from "@/lib/outlet-context";
import { buildWhatsAppBasketLink } from "@/lib/whatsapp";
import { formatNaira } from "@/lib/types";

export function RestaurantBasketDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { items, outletId, updateQuantity, updateNote, removeItem, total, clearBasket } =
    useRestaurantBasket();
  const { outlets } = useOutlet();
  const outlet = outlets.find((o) => o.id === outletId);

  if (!open) return null;

  function handleSendToWhatsApp() {
    const link = buildWhatsAppBasketLink({
      items: items.map((i) => ({
        productName: i.product.name,
        price: Number(i.product.price),
        quantity: i.quantity,
        note: i.note,
      })),
      outletName: outlet?.name,
      outletNumber: outlet?.whatsapp_number,
    });
    window.open(link, "_blank", "noopener,noreferrer");
    clearBasket();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-stone-900/40">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-stone-900">
            <UtensilsCrossed className="h-4 w-4 text-orange-600" />
            Your restaurant order
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <UtensilsCrossed className="h-10 w-10 text-stone-300" />
            <p className="mt-3 text-sm text-stone-600">
              No items yet. Add dishes from the restaurant menu.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {outlet && (
                <p className="mb-3 text-xs text-stone-500">
                  Ordering from <strong>{outlet.name}</strong>
                </p>
              )}
              <div className="space-y-3">
                {items.map(({ product, quantity, note }) => (
                  <div
                    key={product.id}
                    className="rounded-md border border-stone-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-stone-900">
                          {product.name}
                        </div>
                        <div className="text-xs text-stone-500">
                          {formatNaira(Number(product.price))} each
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="p-1 text-stone-400 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-md border border-stone-300">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="p-1.5 text-stone-600 hover:bg-stone-50"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-medium">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="p-1.5 text-stone-600 hover:bg-stone-50"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-xs font-semibold text-stone-800">
                        {formatNaira(Number(product.price) * quantity)}
                      </span>
                    </div>

                    <input
                      type="text"
                      value={note ?? ""}
                      onChange={(e) => updateNote(product.id, e.target.value)}
                      placeholder="Note (e.g. no pepper, extra sauce)"
                      className="mt-2 w-full rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs focus:border-amber-700 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <footer className="border-t border-stone-100 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600">Estimated total</span>
                <span className="font-semibold text-stone-900">
                  {formatNaira(total)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">
                Final price and availability confirmed on WhatsApp.
              </p>
              <button
                onClick={handleSendToWhatsApp}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <MessageCircle className="h-4 w-4" />
                Send order via WhatsApp
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}