"use client";

import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Boxes } from "lucide-react";
import { fetchAdminProduct, updateProduct } from "@/lib/api/products";
import { fetchCategories } from "@/lib/api/categories";
import { LoadingState, ErrorState } from "@/components/ui/states";
import { StockEditor } from "@/components/products/stock-editor";
import { formatNaira } from "@/lib/types";

export default function ProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const qc = useQueryClient();

  const productQuery = useQuery({
    queryKey: ["admin-product", id],
    queryFn: () => fetchAdminProduct(id),
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories-all"],
    queryFn: () => fetchCategories(),
  });

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (productQuery.data && !hydrated) {
      setName(productQuery.data.name);
      setPrice(String(productQuery.data.price));
      setDescription(productQuery.data.description ?? "");
      setCategoryId(productQuery.data.category_id);
      setIsPublished(productQuery.data.is_published);
      setIsFeatured(productQuery.data.is_featured);
      setHydrated(true);
    }
  }, [productQuery.data, hydrated]);

  const mutation = useMutation({
    mutationFn: () =>
      updateProduct(id, {
        name,
        price: parseFloat(price),
        description: description || undefined,
        category_id: categoryId,
        is_published: isPublished,
        is_featured: isFeatured,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-product", id] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  if (productQuery.isLoading) return <LoadingState label="Loading product…" />;
  if (productQuery.isError) return <ErrorState message={productQuery.error.message} />;
  if (!productQuery.data) return <ErrorState message="Product not found" />;

  const product = productQuery.data;

  return (
    <div className="space-y-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-black"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All products
      </Link>

      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-black">{product.name}</h1>
            <div className="mt-1 text-xs text-stone-500">
              {product.sku && <span>{product.sku} · </span>}
              {product.product_categories?.unit ?? "—"} ·{" "}
              {formatNaira(Number(product.price))}
            </div>
          </div>
        </div>
      </header>

      {/* Edit form */}
      <section className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-black border-b border-stone-100 pb-2">
          Product details
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Price (₦)">
            <input
              type="number"
              step="0.01"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              {categoriesQuery.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.unit} — {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-orange-700 focus:ring-orange-700"
            />
            Published (visible to customers)
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-orange-700 focus:ring-orange-700"
            />
            Featured on homepage
          </label>
        </div>

        {mutation.isError && (
          <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
        )}

        <div className="flex justify-end border-t border-stone-100 pt-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-md bg-orange-700 px-5 py-2 text-sm font-medium text-white hover:bg-orange-800 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {mutation.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </section>

      {/* Stock */}
      <section className="rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-black border-b border-stone-100 pb-2">
          <Boxes className="h-4 w-4" />
          Stock by outlet
        </h2>
        <StockEditor productId={product.id} />
      </section>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-700 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600">{label}</span>
      {children}
    </label>
  );
}