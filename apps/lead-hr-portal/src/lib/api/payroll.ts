import { apiClient } from "./client";
import {
  BackdatedCandidateSchema,
  BondItemsResponseSchema,
  CatchUpItemsResponseSchema,
  EntryDeductionsResponseSchema,
  PayrollEntrySchema,
  PayrollPeriodSchema,
  PayrollPeriodsResponseSchema,
  PeriodDetailSchema,
  type BackdatedCandidate,
  type BondItem,
  type CatchUpItem,
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
  backdated: BackdatedCandidate[];
  total_gross: number;
  total_net: number;
}> {
  const { data } = await apiClient.post(`/api/payroll/periods/${periodId}/generate`);
  return {
    ...data,
    backdated: (data.backdated ?? []).map((b: unknown) => BackdatedCandidateSchema.parse(b)),
  };
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

export async function fetchEntryBondItems(entryId: string): Promise<BondItem[]> {
  const { data } = await apiClient.get(
    `/api/payroll/entries/${entryId}/bond-items`,
  );
  return BondItemsResponseSchema.parse(data).items;
}

export async function fetchEntryCatchUps(entryId: string): Promise<CatchUpItem[]> {
  const { data } = await apiClient.get(
    `/api/payroll/entries/${entryId}/catch-ups`,
  );
  return CatchUpItemsResponseSchema.parse(data).items;
}

export async function addCatchUp(
  entryId: string,
  missedPeriodId: string,
): Promise<PayrollEntry> {
  const { data } = await apiClient.post(
    `/api/payroll/entries/${entryId}/catch-up`,
    { entry_id: entryId, missed_period_id: missedPeriodId },
  );
  return PayrollEntrySchema.parse(data);
}