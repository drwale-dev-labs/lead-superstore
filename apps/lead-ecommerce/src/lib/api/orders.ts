import { apiClient } from "./client";
import { OrderDetailSchema, type OrderDetail } from "../types";

export type CreateOrderPayload = {
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  fulfillment_outlet_id: string;
  fulfillment_method: "pickup" | "delivery";
  delivery_address?: string;
  delivery_city?: string;
  delivery_notes?: string;
  items: { product_id: string; quantity: number }[];
};

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<OrderDetail> {
  const { data } = await apiClient.post("/api/orders/", payload);
  return OrderDetailSchema.parse(data);
}

export async function fetchOrder(orderId: string): Promise<OrderDetail> {
  const { data } = await apiClient.get(`/api/orders/${orderId}`);
  return OrderDetailSchema.parse(data);
}