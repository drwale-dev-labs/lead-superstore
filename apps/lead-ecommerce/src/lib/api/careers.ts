import { apiClient } from "./client";
import {
  PublicJobSchema,
  PublicJobsResponseSchema,
  type PublicJob,
} from "../types";

export async function fetchPublicJobs(): Promise<PublicJob[]> {
  const { data } = await apiClient.get("/api/jobs/public");
  return PublicJobsResponseSchema.parse(data).jobs;
}

export async function fetchPublicJob(id: string): Promise<PublicJob> {
  const { data } = await apiClient.get(`/api/jobs/public/${id}`);
  return PublicJobSchema.parse(data);
}

export type ApplicationPayload = {
  job_posting_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  cover_letter?: string;
  cv?: File;
  cover_letter_file?: File;
  certificate?: File;
  nysc_certificate?: File;
};

export type ApplicationResponse = {
  id: string;
  applied_at: string;
};

export async function submitApplication(
  payload: ApplicationPayload,
): Promise<ApplicationResponse> {
  const formData = new FormData();
  formData.append("job_posting_id", payload.job_posting_id);
  formData.append("first_name", payload.first_name);
  formData.append("last_name", payload.last_name);
  formData.append("email", payload.email);
  formData.append("phone", payload.phone);
  if (payload.cover_letter) formData.append("cover_letter", payload.cover_letter);
  if (payload.cv) formData.append("cv", payload.cv);
  if (payload.cover_letter_file)
    formData.append("cover_letter_file", payload.cover_letter_file);
  if (payload.certificate) formData.append("certificate", payload.certificate);
  if (payload.nysc_certificate)
    formData.append("nysc_certificate", payload.nysc_certificate);

  const { data } = await apiClient.post("/api/applications/", formData);
  return data;
}