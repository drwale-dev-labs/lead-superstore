import { apiClient } from "./client";
import {
  EntryDeductionsResponseSchema,
  PayrollEntrySchema,
  PayrollPeriodSchema,
  PayrollPeriodsResponseSchema,
  PeriodDetailSchema,
  type EntryDeduction,
  type PayrollEntry,
  type PayrollPeriod,
  type PayrollStatus,
  type PeriodDetail,
} from "../types";

// ============================================================================
// Periods
// ============================================================================

export type PeriodFilters = {
  outlet_id?: string;
  status?: PayrollStatus;
};

export async function fetchPeriods(filters?: PeriodFilters): Promise<PayrollPeriod[]> {
  const { data } = await apiClient.get("/api/payroll/periods", { params: filters });
  return PayrollPeriodsResponseSchema.parse(data).periods;
}

export async function fetchPeriodDetail(periodId: string): Promise<PeriodDetail> {
  const { data } = await apiClient.get(`/api/payroll/periods/${periodId}`);
  return PeriodDetailSchema.parse(data);
}

export type CreatePeriodPayload = {
  outlet_id: string;
  period_start: string;
  period_end: string;
  notes?: string;
};

export async function createPeriod(
  payload: CreatePeriodPayload,
): Promise<PayrollPeriod> {
  const { data } = await apiClient.post("/api/payroll/periods", payload);
  return PayrollPeriodSchema.parse(data);
}

export async function generateEntries(periodId: string): Promise<{
  period_id: string;
  entries_created: number;
  skipped: string[];
  total_gross: number;
  total_net: number;
}> {
  const { data } = await apiClient.post(`/api/payroll/periods/${periodId}/generate`);
  return data;
}

export async function approvePeriod(periodId: string): Promise<PayrollPeriod> {
  const { data } = await apiClient.post(`/api/payroll/periods/${periodId}/approve`);
  return PayrollPeriodSchema.parse(data);
}

// ============================================================================
// Entries
// ============================================================================

export type UpdateEntryPayload = Partial<{
  gross_salary: number;
  working_days: number;
  deductions: number;
  notes: string;
}>;

export async function updateEntry(
  entryId: string,
  payload: UpdateEntryPayload,
): Promise<PayrollEntry> {
  const { data } = await apiClient.patch(
    `/api/payroll/entries/${entryId}`,
    payload,
  );
  return PayrollEntrySchema.parse(data);
}

export async function fetchEntryDeductions(
  entryId: string,
): Promise<EntryDeduction[]> {
  const { data } = await apiClient.get(
    `/api/payroll/entries/${entryId}/deductions`,
  );
  return EntryDeductionsResponseSchema.parse(data).items;
}