import { z } from "zod";

// ============================================================================
// Public job postings
// ============================================================================

export const PublicJobSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  requirements: z.array(z.string()).nullable(),
  employment_type: z.string(),
  published_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  role_id: z.string().nullable(),
  outlets: z
    .object({ name: z.string(), city: z.string().nullable() })
    .nullable()
    .optional(),
  roles: z.object({ name: z.string(), unit: z.string() }).nullable().optional(),
});

export const PublicJobsResponseSchema = z.object({
  count: z.number(),
  jobs: z.array(PublicJobSchema),
});

export type PublicJob = z.infer<typeof PublicJobSchema>;

// ============================================================================
// Categories
// ============================================================================

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.enum(["Supermarket", "Bakery", "Restaurant"]),
  description: z.string().nullable(),
  display_order: z.number(),
  is_active: z.boolean(),
});

export const CategoriesResponseSchema = z.object({
  count: z.number(),
  categories: z.array(CategorySchema),
});

export type Category = z.infer<typeof CategorySchema>;
export type Unit = "Supermarket" | "Bakery" | "Restaurant";

// ============================================================================
// Products
// ============================================================================

export const ProductSchema = z.object({
  id: z.string().uuid(),
  sku: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  category_id: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  is_restaurant_item: z.boolean(),
  image_url: z.string().nullable(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  created_at: z.string(),
  product_categories: z
    .object({
      name: z.string(),
      unit: z.enum(["Supermarket", "Bakery", "Restaurant"]),
    })
    .nullable()
    .optional(),
});

export const ProductsResponseSchema = z.object({
  count: z.number(),
  products: z.array(ProductSchema),
});

export type Product = z.infer<typeof ProductSchema>;

export const StockEntrySchema = z.object({
  outlet_id: z.string().uuid(),
  quantity: z.number(),
  outlets: z
    .object({
      name: z.string(),
      city: z.string().nullable(),
      is_warehouse: z.boolean(),
    })
    .nullable()
    .optional(),
});

export const ProductStockSchema = z.object({
  product_id: z.string().uuid(),
  is_restaurant_item: z.boolean(),
  stock: z.array(StockEntrySchema),
});

export type StockEntry = z.infer<typeof StockEntrySchema>;
export type ProductStock = z.infer<typeof ProductStockSchema>;

// ============================================================================
// Helpers
// ============================================================================

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}