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
};

export type ApplicationResponse = {
  id: string;
  applied_at: string;
};

export async function submitApplication(
  payload: ApplicationPayload,
): Promise<ApplicationResponse> {
  const { data } = await apiClient.post("/api/applications/", payload);
  return data;
}