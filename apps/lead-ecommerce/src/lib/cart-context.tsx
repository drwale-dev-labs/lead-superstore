"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "./types";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  outletId: string | null;
  addItem: (product: Product, quantity: number, outletId: string) => void;
  wouldReplaceCart: (forOutletId: string) => boolean;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "leadsuperstore.cart";

type StoredCart = {
  outletId: string | null;
  items: { productId: string; quantity: number; product: Product }[];
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [outletId, setOutletId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StoredCart = JSON.parse(raw);
        setOutletId(parsed.outletId);
        setItems(
          parsed.items.map((i) => ({ product: i.product, quantity: i.quantity })),
        );
      }
    } catch {
      // Corrupted cart data — start fresh
    }
    setHydrated(true);
  }, []);

  // Persist on every change (after initial hydration)
  useEffect(() => {
    if (!hydrated) return;
    const stored: StoredCart = {
      outletId,
      items: items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        product: i.product,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }, [items, outletId, hydrated]);

  function wouldReplaceCart(forOutletId: string): boolean {
    return items.length > 0 && outletId !== null && outletId !== forOutletId;
  }

  function addItem(product: Product, quantity: number, forOutletId: string) {
    // If cart has items from a different outlet, clear first. Callers that
    // want to warn the user before this happens should check
    // wouldReplaceCart(forOutletId) and confirm before calling addItem.
    if (outletId && outletId !== forOutletId) {
      setItems([{ product, quantity }]);
      setOutletId(forOutletId);
      return;
    }

    setOutletId(forOutletId);
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...prev, { product, quantity }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)),
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.product.id !== productId);
      if (next.length === 0) setOutletId(null);
      return next;
    });
  }

  function clearCart() {
    setItems([]);
    setOutletId(null);
  }

  const subtotal = items.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0,
  );
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        outletId,
        addItem,
        wouldReplaceCart,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}