import { apiClient } from "./client";
import { OutletsResponseSchema, type Outlet } from "../types";

export async function fetchOutlets(): Promise<Outlet[]> {
  const { data } = await apiClient.get("/api/outlets/");
  const parsed = OutletsResponseSchema.parse(data);
  return parsed.outlets;
}