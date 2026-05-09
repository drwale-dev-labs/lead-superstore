import { apiClient } from "./client";
import {
  ApplicationSchema,
  ApplicationsResponseSchema,
  type Application,
  type ApplicationStatus,
} from "../types";

export type ApplicationFilters = {
  job_posting_id?: string;
  status?: ApplicationStatus;
};

export async function fetchApplications(
  filters?: ApplicationFilters,
): Promise<Application[]> {
  const { data } = await apiClient.get("/api/applications/", { params: filters });
  return ApplicationsResponseSchema.parse(data).applications;
}

export async function fetchApplicationById(id: string): Promise<Application> {
  const { data } = await apiClient.get(`/api/applications/${id}`);
  return ApplicationSchema.parse(data);
}

export type UpdateApplicationPayload = {
  status?: ApplicationStatus;
  notes?: string;
};

export async function updateApplication(
  id: string,
  payload: UpdateApplicationPayload,
): Promise<Application> {
  const { data } = await apiClient.patch(
    `/api/applications/${id}`,
    payload,
  );
  return ApplicationSchema.parse(data);
}