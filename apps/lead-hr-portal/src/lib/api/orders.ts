import { apiClient } from "./client";
import {
  OrderDetailSchema,
  OrderSchema,
  OrdersResponseSchema,
  type Order,
  type OrderDetail,
  type OrderStatus,
} from "../types";

export type OrderFilters = {
  status?: OrderStatus;
  outlet_id?: string;
  fulfillment_method?: "pickup" | "delivery";
};

export async function fetchOrders(filters?: OrderFilters): Promise<Order[]> {
  const { data } = await apiClient.get("/api/orders/admin/", { params: filters });
  return OrdersResponseSchema.parse(data).orders;
}

export async function fetchOrderDetail(orderId: string): Promise<OrderDetail> {
  const { data } = await apiClient.get(`/api/orders/admin/${orderId}`);
  return OrderDetailSchema.parse(data);
}

export type UpdateOrderPayload = Partial<{
  status: OrderStatus;
  delivery_fee: number;
  staff_notes: string;
}>;

export async function updateOrder(
  orderId: string,
  payload: UpdateOrderPayload,
): Promise<Order> {
  const { data } = await apiClient.patch(`/api/orders/admin/${orderId}`, payload);
  return OrderSchema.parse(data);
}