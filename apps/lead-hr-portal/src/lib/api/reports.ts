import { apiClient } from "./client";

export async function fetchHeadcountReport() {
  const { data } = await apiClient.get("/api/reports/headcount");
  return data;
}
export async function fetchHiringFunnelReport() {
  const { data } = await apiClient.get("/api/reports/hiring-funnel");
  return data;
}
export async function fetchPayrollSummaryReport() {
  const { data } = await apiClient.get("/api/reports/payroll-summary");
  return data;
}
export async function fetchTurnoverReport() {
  const { data } = await apiClient.get("/api/reports/turnover");
  return data;
}
export async function fetchSalesReport() {
  const { data } = await apiClient.get("/api/reports/sales");
  return data;
}