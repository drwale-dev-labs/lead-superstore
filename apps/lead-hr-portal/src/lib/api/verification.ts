import { apiClient } from "./client";
import {
  GuarantorsResponseSchema,
  ReferencesResponseSchema,
  VerificationStatusSchema,
  type Guarantor,
  type Reference,
  type ReferenceType,
  type VerificationStatus,
} from "../types";

// ============================================================================
// References
// ============================================================================

export type ReferenceFormPayload = {
  reference_type: ReferenceType;
  full_name: string;
  phone: string;
  relationship: string;
  email?: string;
  organization?: string;
  note?: string;
  document?: File;
};

export async function fetchReferences(staffId: string): Promise<Reference[]> {
  const { data } = await apiClient.get(`/api/verification/staff/${staffId}/references`);
  return ReferencesResponseSchema.parse(data).references;
}

export async function addReference(
  staffId: string,
  payload: ReferenceFormPayload,
): Promise<Reference> {
  const form = new FormData();
  form.append("reference_type", payload.reference_type);
  form.append("full_name", payload.full_name);
  form.append("phone", payload.phone);
  form.append("relationship", payload.relationship);
  if (payload.email) form.append("email", payload.email);
  if (payload.organization) form.append("organization", payload.organization);
  if (payload.note) form.append("note", payload.note);
  if (payload.document) form.append("document", payload.document);

  const { data } = await apiClient.post(
    `/api/verification/staff/${staffId}/references`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

// ============================================================================
// Guarantors
// ============================================================================

export type GuarantorFormPayload = {
  full_name: string;
  phone: string;
  address: string;
  occupation: string;
  relationship: string;
  email?: string;
  id_type?: string;
  id_number?: string;
  note?: string;
  document?: File;
};

export async function fetchGuarantors(staffId: string): Promise<Guarantor[]> {
  const { data } = await apiClient.get(`/api/verification/staff/${staffId}/guarantors`);
  return GuarantorsResponseSchema.parse(data).guarantors;
}

export async function addGuarantor(
  staffId: string,
  payload: GuarantorFormPayload,
): Promise<Guarantor> {
  const form = new FormData();
  form.append("full_name", payload.full_name);
  form.append("phone", payload.phone);
  form.append("address", payload.address);
  form.append("occupation", payload.occupation);
  form.append("relationship", payload.relationship);
  if (payload.email) form.append("email", payload.email);
  if (payload.id_type) form.append("id_type", payload.id_type);
  if (payload.id_number) form.append("id_number", payload.id_number);
  if (payload.note) form.append("note", payload.note);
  if (payload.document) form.append("document", payload.document);

  const { data } = await apiClient.post(
    `/api/verification/staff/${staffId}/guarantors`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

// ============================================================================
// Status + signed URLs
// ============================================================================

export async function fetchVerificationStatus(
  staffId: string,
): Promise<VerificationStatus> {
  const { data } = await apiClient.get(`/api/verification/staff/${staffId}/status`);
  return VerificationStatusSchema.parse(data);
}

export async function getSignedUrl(path: string): Promise<string> {
  const { data } = await apiClient.get("/api/verification/documents/signed-url", {
    params: { path },
  });
  return data.url;
}