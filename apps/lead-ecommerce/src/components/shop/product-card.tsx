import Link from "next/link";
import { formatNaira, type Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/shop/products/${product.slug}`}
      className="group rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-amber-300"
    >
      <div className="aspect-square overflow-hidden rounded-md bg-stone-100">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
            No image
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-stone-500">
          {product.product_categories?.name ?? product.category_id}
        </div>
        <div className="mt-0.5 line-clamp-2 text-sm font-medium text-stone-900 group-hover:text-amber-700">
          {product.name}
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-stone-900">
            {formatNaira(Number(product.price))}
          </span>
          {product.is_restaurant_item && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-800">
              Restaurant
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}