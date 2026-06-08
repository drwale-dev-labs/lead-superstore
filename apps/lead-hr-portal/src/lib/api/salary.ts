import { apiClient } from "./client";
import {
  SalaryStructureSchema,
  SalaryStructuresResponseSchema,
  type SalaryStructure,
} from "../types";

export async function fetchSalaryStructures(
  staffId: string,
): Promise<SalaryStructure[]> {
  const { data } = await apiClient.get("/api/payroll/salary-structures", {
    params: { staff_id: staffId },
  });
  return SalaryStructuresResponseSchema.parse(data).salary_structures;
}

export type CreateSalaryPayload = {
  staff_id: string;
  gross_salary: number;
  effective_from: string;
  notes?: string;
};

export async function createSalaryStructure(
  payload: CreateSalaryPayload,
): Promise<SalaryStructure> {
  const { data } = await apiClient.post(
    "/api/payroll/salary-structures",
    payload,
  );
  return SalaryStructureSchema.parse(data);
}