import { apiClient } from "./client";
import { AccountsResponseSchema, AccountSchema, type Account } from "../types";

export async function fetchAccounts(): Promise<Account[]> {
  const { data } = await apiClient.get("/api/accounts/");
  return AccountsResponseSchema.parse(data).accounts;
}

export async function createAccount(
  email: string,
  password: string,
  fullName?: string,
): Promise<Account> {
  const { data } = await apiClient.post("/api/accounts/", {
    email,
    password,
    full_name: fullName || undefined,
  });
  return AccountSchema.parse(data);
}

export async function updateAccountName(
  accountId: string,
  fullName: string,
): Promise<Account> {
  const { data } = await apiClient.patch(`/api/accounts/${accountId}`, {
    full_name: fullName || null,
  });
  return AccountSchema.parse(data);
}

export async function deleteAccount(accountId: string): Promise<void> {
  await apiClient.delete(`/api/accounts/${accountId}`);
}

export async function resetAccountPassword(
  accountId: string,
  password: string,
): Promise<void> {
  await apiClient.patch(`/api/accounts/${accountId}/password`, { password });
}
