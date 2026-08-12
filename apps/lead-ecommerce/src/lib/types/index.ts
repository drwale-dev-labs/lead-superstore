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
// Orders
// ============================================================================

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  product_name: z.string(),
  unit_price: z.number(),
  quantity: z.number(),
  line_total: z.number(),
});

export const OrderStatusEnum = z.enum([
  "pending_payment",
  "payment_received",
  "confirmed",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
  "refunded",
]);
export type OrderStatus = z.infer<typeof OrderStatusEnum>;

export const OrderSchema = z.object({
  id: z.string().uuid(),
  order_number: z.string(),
  fulfillment_method: z.enum(["pickup", "delivery"]),
  delivery_address: z.string().nullable(),
  delivery_city: z.string().nullable(),
  delivery_notes: z.string().nullable(),
  subtotal: z.number(),
  delivery_fee: z.number(),
  service_charge: z.number(),
  total: z.number(),
  status: OrderStatusEnum,
  paid_at: z.string().nullable().optional(),
  created_at: z.string(),
  outlets: z
    .object({
      name: z.string(),
      city: z.string().nullable(),
      phone: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  customers: z
    .object({
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      phone: z.string(),
    })
    .nullable()
    .optional(),
});

export const OrderDetailSchema = z.object({
  order: OrderSchema,
  items: z.array(OrderItemSchema),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type OrderDetail = z.infer<typeof OrderDetailSchema>;

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