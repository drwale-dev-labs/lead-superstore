import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { OutletProvider } from "@/lib/outlet-context";
import { CartProvider } from "@/lib/cart-context";
import { RestaurantBasketProvider } from "@/lib/restaurant-basket-context";
import { CustomerAuthProvider } from "@/lib/customer-auth-context";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
const title = "Lead Superstore";
const description =
  "Your Osun State's favourite destination for shopping, fresh bakery treats, delicious meals, and rewarding careers. We've got it all.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s — ${title}`,
  },
  description,
  openGraph: {
    title,
    description,
    url: siteUrl,
    siteName: title,
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
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