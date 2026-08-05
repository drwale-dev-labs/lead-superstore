import { apiClient } from "./client";

export type InitializePaymentResponse = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializePayment(
  orderId: string,
): Promise<InitializePaymentResponse> {
  const { data } = await apiClient.post("/api/payments/initialize", {
    order_id: orderId,
  });
  return data;
}

export type VerifyPaymentResponse = {
  status: "success" | "failed";
  order_id: string;
  order_number: string;
  amount: number;
};

export async function verifyPayment(
  reference: string,
): Promise<VerifyPaymentResponse> {
  const { data } = await apiClient.get(`/api/payments/verify/${reference}`);
  return data;
}