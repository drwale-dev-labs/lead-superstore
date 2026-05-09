import { apiClient } from "./client";
import {
  JobPostingSchema,
  JobPostingsResponseSchema,
  type JobPosting,
  type JobStatus,
} from "../types";

export type JobFilters = {
  status?: JobStatus;
  outlet_id?: string;
};

export async function fetchJobs(filters?: JobFilters): Promise<JobPosting[]> {
  const { data } = await apiClient.get("/api/jobs/", { params: filters });
  return JobPostingsResponseSchema.parse(data).jobs;
}

export async function fetchJobById(id: string): Promise<JobPosting> {
  const { data } = await apiClient.get(`/api/jobs/${id}`);
  return JobPostingSchema.parse(data);
}

export type CreateJobPayload = {
  role_id: string;
  outlet_id: string;
  title: string;
  description?: string;
  requirements?: string[];
  employment_type?: string;
  closes_at?: string;
};

export async function createJob(payload: CreateJobPayload): Promise<JobPosting> {
  const { data } = await apiClient.post("/api/jobs/", payload);
  return JobPostingSchema.parse(data);
}

export type UpdateJobPayload = Partial<{
  title: string;
  description: string;
  requirements: string[];
  employment_type: string;
  closes_at: string;
}>;

export async function updateJob(
  id: string,
  payload: UpdateJobPayload,
): Promise<JobPosting> {
  const { data } = await apiClient.patch(`/api/jobs/${id}`, payload);
  return JobPostingSchema.parse(data);
}

export async function publishJob(id: string): Promise<JobPosting> {
  const { data } = await apiClient.post(`/api/jobs/${id}/publish`);
  return JobPostingSchema.parse(data);
}

export async function closeJob(id: string): Promise<JobPosting> {
  const { data } = await apiClient.post(`/api/jobs/${id}/close`);
  return JobPostingSchema.parse(data);
}

// AI generation
export type GenerateAdPayload = {
  role_id: string;
  outlet_id: string;
  employment_type?: string;
};

export type GenerateAdResponse = {
  description: string;
  role_name: string;
  unit: string;
  outlet_name: string;
};

export async function generateJobAd(
  payload: GenerateAdPayload,
): Promise<GenerateAdResponse> {
  const { data } = await apiClient.post("/api/ai/generate-job-ad", payload);
  return data;
}