import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { OutletProvider } from "@/lib/outlet-context";
import { CartProvider } from "@/lib/cart-context";
import { RestaurantBasketProvider } from "@/lib/restaurant-basket-context";
import { CustomerAuthProvider } from "@/lib/customer-auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lead Superstore",
  description:
    "Your Osun State's favourite destination for shopping, fresh bakery treats, delicious meals, and rewarding careers. We've got it all.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <CustomerAuthProvider>
            <OutletProvider>
              <CartProvider>
                <RestaurantBasketProvider>{children}</RestaurantBasketProvider>
              </CartProvider>
            </OutletProvider>
          </CustomerAuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}