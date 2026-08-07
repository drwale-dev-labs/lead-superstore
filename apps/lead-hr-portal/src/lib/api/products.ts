import { apiClient } from "./client";
import {
  AdminProductSchema,
  AdminProductStockSchema,
  AdminProductsResponseSchema,
  type AdminProduct,
  type AdminProductStock,
} from "../types";

export type AdminProductFilters = {
  category_id?: string;
  unit?: string;
  search?: string;
};

export async function fetchAdminProducts(
  filters?: AdminProductFilters,
): Promise<AdminProduct[]> {
  const { data } = await apiClient.get("/api/products/admin/list", { params: filters });
  return AdminProductsResponseSchema.parse(data).products;
}

export async function fetchAdminProduct(id: string): Promise<AdminProduct> {
  const { data } = await apiClient.get(`/api/products/admin/${id}`);
  return AdminProductSchema.parse(data);
}

export type CreateProductPayload = {
  sku?: string;
  name: string;
  slug: string;
  category_id: string;
  description?: string;
  price: number;
  is_restaurant_item?: boolean;
  image_url?: string;
  is_published?: boolean;
  is_featured?: boolean;
};

export async function createProduct(
  payload: CreateProductPayload,
): Promise<AdminProduct> {
  const { data } = await apiClient.post("/api/products/admin", payload);
  return AdminProductSchema.parse(data);
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export async function updateProduct(
  id: string,
  payload: UpdateProductPayload,
): Promise<AdminProduct> {
  const { data } = await apiClient.patch(`/api/products/admin/${id}`, payload);
  return AdminProductSchema.parse(data);
}

export async function fetchProductStock(id: string): Promise<AdminProductStock> {
  const { data } = await apiClient.get(`/api/products/admin/${id}/stock`);
  return AdminProductStockSchema.parse(data);
}

export async function setProductStock(
  id: string,
  outletId: string,
  quantity: number,
): Promise<AdminProductStock> {
  const { data } = await apiClient.put(`/api/products/admin/${id}/stock`, {
    outlet_id: outletId,
    quantity,
  });
  return AdminProductStockSchema.parse(data);
}