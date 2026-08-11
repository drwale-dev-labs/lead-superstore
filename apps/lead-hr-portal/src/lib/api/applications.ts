import { apiClient } from "./client";
import {
  ApplicationSchema,
  ApplicationsResponseSchema,
  InterviewScoreSchema,
  type Application,
  type ApplicationStatus,
  type InterviewScore,
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

export async function fetchApplicationDocumentUrl(
  applicationId: string,
  path: string,
): Promise<string> {
  const { data } = await apiClient.get(
    `/api/applications/${applicationId}/documents/signed-url`,
    { params: { path } },
  );
  return data.url;
}

export type UpdateApplicationPayload = {
  status?: ApplicationStatus;
  notes?: string;
  interview_scheduled_at?: string;
  interview_location?: string;
  resume_date?: string;
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

export async function fetchInterviewScore(
  applicationId: string,
): Promise<InterviewScore | null> {
  try {
    const { data } = await apiClient.get(
      `/api/applications/${applicationId}/interview-score`,
    );
    return InterviewScoreSchema.parse(data);
  } catch (err) {
    if ((err as Error).message?.toLowerCase().includes("no interview score")) {
      return null;
    }
    throw err;
  }
}

export type InterviewScorePayload = {
  communication_score: number;
  role_knowledge_score: number;
  reliability_score: number;
  culture_fit_score: number;
  overall_comment?: string;
};

export async function saveInterviewScore(
  applicationId: string,
  payload: InterviewScorePayload,
): Promise<InterviewScore> {
  const { data } = await apiClient.put(
    `/api/applications/${applicationId}/interview-score`,
    payload,
  );
  return InterviewScoreSchema.parse(data);
}