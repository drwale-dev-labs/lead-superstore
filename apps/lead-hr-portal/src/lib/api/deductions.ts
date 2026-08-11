import { apiClient } from "./client";
import {
  AdvanceSchema,
  AdvancesResponseSchema,
  FineSchema,
  FinesResponseSchema,
  LoanSchema,
  LoansResponseSchema,
  type Advance,
  type Fine,
  type Loan,
} from "../types";

// ============================================================================
// Loans
// ============================================================================

export async function fetchLoans(params?: {
  staff_id?: string;
  status?: string;
}): Promise<Loan[]> {
  const { data } = await apiClient.get("/api/deductions/loans", { params });
  return LoansResponseSchema.parse(data).loans;
}

export type CreateLoanPayload = {
  staff_id: string;
  principal: number;
  monthly_installment: number;
  notes?: string;
};

export async function createLoan(payload: CreateLoanPayload): Promise<Loan> {
  const { data } = await apiClient.post("/api/deductions/loans", payload);
  return LoanSchema.parse(data);
}

export async function updateLoan(
  id: string,
  payload: { status?: string; monthly_installment?: number; notes?: string },
): Promise<Loan> {
  const { data } = await apiClient.patch(`/api/deductions/loans/${id}`, payload);
  return LoanSchema.parse(data);
}

// ============================================================================
// Advances
// ============================================================================

export async function fetchAdvances(params?: {
  staff_id?: string;
  status?: string;
}): Promise<Advance[]> {
  const { data } = await apiClient.get("/api/deductions/advances", { params });
  return AdvancesResponseSchema.parse(data).advances;
}

export type CreateAdvancePayload = {
  staff_id: string;
  amount: number;
  reason?: string;
};

export async function createAdvance(
  payload: CreateAdvancePayload,
): Promise<Advance> {
  const { data } = await apiClient.post("/api/deductions/advances", payload);
  return AdvanceSchema.parse(data);
}

export async function updateAdvance(
  id: string,
  payload: { status?: string; amount?: number; reason?: string },
): Promise<Advance> {
  const { data } = await apiClient.patch(
    `/api/deductions/advances/${id}`,
    payload,
  );
  return AdvanceSchema.parse(data);
}

// ============================================================================
// Fines
// ============================================================================

export async function fetchFines(params?: {
  staff_id?: string;
  status?: string;
}): Promise<Fine[]> {
  const { data } = await apiClient.get("/api/deductions/fines", { params });
  return FinesResponseSchema.parse(data).fines;
}

export type CreateFinePayload = {
  staff_id: string;
  amount: number;
  reason: string;
};

export async function createFine(payload: CreateFinePayload): Promise<Fine> {
  const { data } = await apiClient.post("/api/deductions/fines", payload);
  return FineSchema.parse(data);
}

export async function approveFine(id: string): Promise<Fine> {
  const { data } = await apiClient.post(
    `/api/deductions/fines/${id}/approve`,
  );
  return FineSchema.parse(data);
}

export async function updateFine(
  id: string,
  payload: { status?: string; amount?: number; reason?: string },
): Promise<Fine> {
  const { data } = await apiClient.patch(`/api/deductions/fines/${id}`, payload);
  return FineSchema.parse(data);
}