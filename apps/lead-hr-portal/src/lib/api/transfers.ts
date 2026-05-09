import { apiClient } from "./client";
import {
  AssignmentSchema,
  AssignmentsResponseSchema,
  type Assignment,
} from "../types";

export async function fetchAssignments(staffId: string): Promise<Assignment[]> {
  const { data } = await apiClient.get(
    `/api/transfers/staff/${staffId}/assignments`,
  );
  return AssignmentsResponseSchema.parse(data).assignments;
}

export type TransferPayload = {
  new_outlet_id: string;
  new_role_id: string;
  effective_date: string; // ISO date
  transfer_reason: string;
  approved_by_name?: string;
  is_approved: boolean;
};

export async function transferStaff(
  staffId: string,
  payload: TransferPayload,
): Promise<Assignment> {
  const { data } = await apiClient.post(
    `/api/transfers/staff/${staffId}/transfer`,
    payload,
  );
  return AssignmentSchema.parse(data);
}