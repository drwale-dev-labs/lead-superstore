import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/account/", "/cart", "/checkout", "/payment/", "/track"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
