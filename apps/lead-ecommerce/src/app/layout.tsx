import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { OutletProvider } from "@/lib/outlet-context";
import { CartProvider } from "@/lib/cart-context";
import { RestaurantBasketProvider } from "@/lib/restaurant-basket-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lead Superstore",
  description:
    "Osun State's favourite supermarket, bakery, and restaurant. Shop online, find a career.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <OutletProvider>
            <CartProvider>
              <RestaurantBasketProvider>{children}</RestaurantBasketProvider>
            </CartProvider>
          </OutletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}