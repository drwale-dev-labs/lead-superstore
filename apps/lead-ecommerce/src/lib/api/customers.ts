import { apiClient } from "./client";

export type CustomerSession = {
  token: string;
  expires_at: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
};

export async function requestLoginCode(email: string): Promise<void> {
  await apiClient.post("/api/customers/request-code", { email });
}

export async function verifyLoginCode(
  email: string,
  code: string,
): Promise<CustomerSession> {
  const { data } = await apiClient.post("/api/customers/verify-code", {
    email,
    code,
  });
  return data;
}

export type MyOrder = {
  id: string;
  order_number: string;
  fulfillment_method: "pickup" | "delivery";
  fulfillment_outlet_id: string;
  status: string;
  total: number;
  created_at: string;
  outlets: { name: string; city: string | null } | null;
};

export async function fetchMyOrders(): Promise<MyOrder[]> {
  const { data } = await apiClient.get("/api/customers/me/orders");
  return data.orders;
}

export type MyOrderItem = {
  id: string;
  product_id: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export async function fetchMyOrderItems(orderId: string): Promise<MyOrderItem[]> {
  const { data } = await apiClient.get(`/api/customers/me/orders/${orderId}/items`);
  return data.items;
}
