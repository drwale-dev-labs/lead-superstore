"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CustomerSession } from "./api/customers";

const STORAGE_KEY = "lead_customer_session";

type CustomerAuthContextValue = {
  session: CustomerSession | null;
  isReady: boolean;
  login: (session: CustomerSession) => void;
  logout: () => void;
};

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CustomerSession = JSON.parse(raw);
        if (new Date(parsed.expires_at) > new Date()) {
          setSession(parsed);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Corrupted session data — start logged out
    }
    setIsReady(true);
  }, []);

  function login(newSession: CustomerSession) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  return (
    <CustomerAuthContext.Provider value={{ session, isReady, login, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) {
    throw new Error("useCustomerAuth must be used within a CustomerAuthProvider");
  }
  return ctx;
}
