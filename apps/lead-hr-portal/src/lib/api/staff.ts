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
  bank_sort_code?: string | null;
};

export async function createStaff(payload: CreateStaffPayload): Promise<Staff> {
  const { data } = await apiClient.post("/api/staff/", payload);
  return StaffSchema.parse(data);
}

export async function activateStaff(id: string): Promise<Staff> {
  const { data } = await apiClient.post(`/api/staff/${id}/activate`);
  return StaffSchema.parse(data);
}

export async function activateExistingStaff(id: string): Promise<Staff> {
  const { data } = await apiClient.post(`/api/staff/${id}/activate-existing`);
  return StaffSchema.parse(data);
}

export type UpdateStaffPayload = Partial<{
  outlet_id: string;
  role_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  status: StaffStatus;
  hired_at: string;
  notes: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_sort_code: string | null;
}>;

export async function updateStaff(
  id: string,
  payload: UpdateStaffPayload,
): Promise<Staff> {
  const { data } = await apiClient.patch(`/api/staff/${id}`, payload);
  return StaffSchema.parse(data);
}

export type TrainingBondOutcome = {
  outcome: "forfeited" | "review_required";
  amount_forfeited?: number;
  outstanding_balance?: number;
} | null;

export async function terminateStaff(
  id: string,
): Promise<{ staff: Staff; training_bond: TrainingBondOutcome }> {
  const { data } = await apiClient.delete(`/api/staff/${id}`);
  return { staff: StaffSchema.parse(data.staff), training_bond: data.training_bond };
}