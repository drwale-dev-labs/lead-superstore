import { apiClient } from "./client";
import { RolesResponseSchema, type Role } from "../types";

export async function fetchRoles(unit?: string): Promise<Role[]> {
  const { data } = await apiClient.get("/api/roles/", {
    params: unit ? { unit } : undefined,
  });
  const parsed = RolesResponseSchema.parse(data);
  return parsed.roles;
}