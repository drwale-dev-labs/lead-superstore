import type { Metadata } from "next";
import { fetchProductBySlug } from "@/lib/api/shop";
import { formatNaira } from "@/lib/types";
import { ProductDetailClient } from "./product-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  try {
    const product = await fetchProductBySlug(slug);
    const description =
      product.description ??
      `${product.name} — ${formatNaira(Number(product.price))} at Lead Superstore.`;

    return {
      title: `${product.name} | Lead Superstore`,
      description,
      openGraph: {
        title: product.name,
        description,
        images: product.image_url ? [product.image_url] : undefined,
      },
    };
  } catch {
    // Product not found or API unreachable — fall back to generic site
    // metadata rather than failing the page.
    return {
      title: "Product | Lead Superstore",
    };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductDetailClient slug={slug} />;
}
