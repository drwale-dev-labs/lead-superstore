"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/api/categories";
import { createProduct } from "@/lib/api/products";
import { ErrorState } from "@/components/ui/states";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function NewProductPage() {
  const router = useRouter();
  const categoriesQuery = useQuery({ queryKey: ["categories-all"], queryFn: () => fetchCategories() });

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [isRestaurantItem, setIsRestaurantItem] = useState(false);

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (product) => {
      router.push(`/products/${product.id}`);
    },
  });

  const canSubmit = name && price && categoryId && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      name,
      slug: slugify(name),
      sku: sku || undefined,
      price: parseFloat(price),
      category_id: categoryId,
      description: description || undefined,
      is_restaurant_item: isRestaurantItem,
      is_published: true,
    });
  }

  const selectedCategory = categoriesQuery.data?.find((c) => c.id === categoryId);
  const isRestaurantUnit = selectedCategory?.unit === "Restaurant";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-stone-600">
        Create a new product. If it belongs to a Restaurant category, mark it as a
        restaurant item — it won&apos;t carry stock and customers order it via
        WhatsApp instead of checkout.
      </p>

      <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-6 space-y-4">
        <Field label="Name" required>
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="SKU (optional)">
            <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Price (₦)" required>
            <input
              type="number"
              step="0.01"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
        </div>

        <Field label="Category" required>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              const cat = categoriesQuery.data?.find((c) => c.id === e.target.value);
              setIsRestaurantItem(cat?.unit === "Restaurant");
            }}
            required
            className={inputCls}
          >
            <option value="">Select category…</option>
            {categoriesQuery.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.unit} — {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>

        {isRestaurantUnit && (
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={isRestaurantItem}
              onChange={(e) => setIsRestaurantItem(e.target.checked)}
              className="h-4 w-4 rounded border-stone-300 text-amber-700 focus:ring-amber-700"
            />
            Restaurant item (no stock tracking, ordered via WhatsApp)
          </label>
        )}

        {mutation.isError && <ErrorState message={(mutation.error as Error).message} />}

        <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
          <button
            type="button"
            onClick={() => router.push("/products")}
            className="rounded-md border border-stone-300 bg-white px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-amber-700 px-5 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {mutation.isPending ? "Creating…" : "Create product"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm focus:border-amber-700 focus:outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-stone-600">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}