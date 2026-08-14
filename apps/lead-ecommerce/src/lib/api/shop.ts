import { apiClient } from "./client";
import {
  CategoriesResponseSchema,
  ProductSchema,
  ProductStockSchema,
  ProductsResponseSchema,
  type Category,
  type Product,
  type ProductStock,
  type Unit,
} from "../types";

export async function fetchCategories(unit?: Unit): Promise<Category[]> {
  const { data } = await apiClient.get("/api/products/categories", {
    params: unit ? { unit } : undefined,
  });
  return CategoriesResponseSchema.parse(data).categories;
}

export type ProductFilters = {
  category_id?: string;
  unit?: Unit;
  featured?: boolean;
  search?: string;
};

export async function fetchProducts(
  filters?: ProductFilters,
): Promise<Product[]> {
  const { data } = await apiClient.get("/api/products/", { params: filters });
  return ProductsResponseSchema.parse(data).products;
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  const { data } = await apiClient.get(`/api/products/${slug}`);
  return ProductSchema.parse(data);
}

export async function fetchProductStock(slug: string): Promise<ProductStock> {
  const { data } = await apiClient.get(`/api/products/${slug}/stock`);
  return ProductStockSchema.parse(data);
}

export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data } = await apiClient.get("/api/products/by-ids", {
    params: { ids: ids.join(",") },
  });
  return ProductsResponseSchema.parse(data).products;
}