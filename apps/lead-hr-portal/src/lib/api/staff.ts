import { apiClient } from "./client";
import {
  StaffListResponseSchema,
  StaffSchema,
  type Staff,
  type StaffStatus,
} from "../types";

export type StaffFilters = {
  outlet_id?: string;
  status?: StaffStatus;
  search?: string;
};

export async function fetchStaff(filters?: StaffFilters): Promise<Staff[]> {
  const { data } = await apiClient.get("/api/staff/", { params: filters });
  return StaffListResponseSchema.parse(data).staff;
}

export async function fetchStaffById(id: string): Promise<Staff> {
  const { data } = await apiClient.get(`/api/staff/${id}`);
  return StaffSchema.parse(data);
}

export type CreateStaffPayload = {
  outlet_id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  hired_at: string;
  status?: StaffStatus;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_name?: string | null;
};

export async function createStaff(payload: CreateStaffPayload): Promise<Staff> {
  const { data } = await apiClient.post("/api/staff/", payload);
  return StaffSchema.parse(data);
}

export async function activateStaff(id: string): Promise<Staff> {
  const { data } = await apiClient.post(`/api/staff/${id}/activate`);
  return StaffSchema.parse(data);
}