"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchShoppingOutlets, type Outlet } from "./api/outlets";

type OutletContextValue = {
  outlet: Outlet | null;
  setOutlet: (outlet: Outlet) => void;
  outlets: Outlet[];
  isLoading: boolean;
  isReady: boolean;
};

const OutletContext = createContext<OutletContextValue | null>(null);

const STORAGE_KEY = "leadsuperstore.outlet_id";

export function OutletProvider({ children }: { children: ReactNode }) {
  const outletsQuery = useQuery({
    queryKey: ["shopping-outlets"],
    queryFn: fetchShoppingOutlets,
  });

  const [outletId, setOutletId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Load persisted choice once, on mount
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    setOutletId(stored);
    setIsReady(true);
  }, []);

  const outlet =
    outletsQuery.data?.find((o) => o.id === outletId) ?? null;

  function setOutlet(o: Outlet) {
    setOutletId(o.id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, o.id);
    }
  }

  return (
    <OutletContext.Provider
      value={{
        outlet,
        setOutlet,
        outlets: outletsQuery.data ?? [],
        isLoading: outletsQuery.isLoading,
        isReady,
      }}
    >
      {children}
    </OutletContext.Provider>
  );
}

export function useOutlet() {
  const ctx = useContext(OutletContext);
  if (!ctx) throw new Error("useOutlet must be used inside <OutletProvider>");
  return ctx;
}