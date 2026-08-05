"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "./types";

export type BasketItem = {
  product: Product;
  quantity: number;
  note?: string;
};

type BasketContextValue = {
  items: BasketItem[];
  outletId: string | null;
  addItem: (product: Product, outletId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNote: (productId: string, note: string) => void;
  removeItem: (productId: string) => void;
  clearBasket: () => void;
  total: number;
  itemCount: number;
};

const BasketContext = createContext<BasketContextValue | null>(null);

const STORAGE_KEY = "leadsuperstore.restaurant_basket";

type StoredBasket = {
  outletId: string | null;
  items: BasketItem[];
};

export function RestaurantBasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [outletId, setOutletId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StoredBasket = JSON.parse(raw);
        setOutletId(parsed.outletId);
        setItems(parsed.items);
      }
    } catch {
      // Corrupted — start fresh
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ outletId, items } satisfies StoredBasket),
    );
  }, [items, outletId, hydrated]);

  function addItem(product: Product, forOutletId: string, quantity = 1) {
    if (outletId && outletId !== forOutletId) {
      // Switching outlets mid-basket clears prior items — a Bolanle order
      // and an Isokun order can't be combined into one WhatsApp message.
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

  function updateNote(productId: string, note: string) {
    setItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, note } : i)),
    );
  }

  function removeItem(productId: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.product.id !== productId);
      if (next.length === 0) setOutletId(null);
      return next;
    });
  }

  function clearBasket() {
    setItems([]);
    setOutletId(null);
  }

  const total = items.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0,
  );
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <BasketContext.Provider
      value={{
        items,
        outletId,
        addItem,
        updateQuantity,
        updateNote,
        removeItem,
        clearBasket,
        total,
        itemCount,
      }}
    >
      {children}
    </BasketContext.Provider>
  );
}

export function useRestaurantBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx)
    throw new Error(
      "useRestaurantBasket must be used inside <RestaurantBasketProvider>",
    );
  return ctx;
}