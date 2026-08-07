import { apiClient } from "./client";
import { CategorySchema, CategoriesResponseSchema, type Category } from "../types";

export async function fetchCategories(unit?: string): Promise<Category[]> {
  const { data } = await apiClient.get("/api/products/categories", {
    params: unit ? { unit } : undefined,
  });
  return CategoriesResponseSchema.parse(data).categories;
}