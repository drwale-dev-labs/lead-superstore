import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/query-provider";
import { OutletProvider } from "@/lib/outlet-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lead Superstore",
  description:
    "Your Osun State's favourite supermarket, bakery, and restaurant. Shop online, find a career.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          <OutletProvider>{children}</OutletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}