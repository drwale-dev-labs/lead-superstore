import { apiClient } from "./client";
import { ContractSchema, ContractsResponseSchema, type Contract } from "../types";

export async function fetchContracts(staffId: string): Promise<Contract[]> {
  const { data } = await apiClient.get(`/api/contracts/staff/${staffId}`);
  return ContractsResponseSchema.parse(data).contracts;
}

export async function generateContract(staffId: string): Promise<Contract> {
  const { data } = await apiClient.post(`/api/contracts/staff/${staffId}/generate`);
  return ContractSchema.parse(data);
}

export async function updateContract(
  staffId: string,
  contractId: string,
  contentHtml: string,
): Promise<Contract> {
  const { data } = await apiClient.patch(
    `/api/contracts/staff/${staffId}/${contractId}`,
    { content_html: contentHtml },
  );
  return ContractSchema.parse(data);
}

export async function sendContract(
  staffId: string,
  contractId: string,
): Promise<Contract> {
  const { data } = await apiClient.post(
    `/api/contracts/staff/${staffId}/${contractId}/send`,
  );
  return ContractSchema.parse(data);
}

export async function uploadSignedContract(
  staffId: string,
  contractId: string,
  file: File,
): Promise<Contract> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post(
    `/api/contracts/staff/${staffId}/${contractId}/upload-signed`,
    form,
  );
  return ContractSchema.parse(data);
}

export async function getContractSignedUrl(path: string): Promise<string> {
  const { data } = await apiClient.get("/api/contracts/signed-url", {
    params: { path },
  });
  return data.url;
}
