import axios from "axios";
import { createClient } from "@/lib/supabase/client";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
});

// Request interceptor — sets JSON content-type only when the body isn't FormData,
// so multipart uploads get the correct browser-generated boundary header.
// Also attaches the current Supabase session's access token as a Bearer
// header, since every HR-only backend route requires a valid session.
apiClient.interceptors.request.use(async (config) => {
  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }

  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  return config;
});

// Response interceptor — surfaces backend errors as readable Error messages.
// Handles FastAPI's three error shapes: string detail (our handlers),
// array detail (422 validation errors), and unknown structured payloads.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    let message: string;

    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail)) {
      message = detail
        .map((d: { msg?: string; loc?: (string | number)[] }) => {
          const field = d.loc?.slice(-1)[0] ?? "field";
          return `${String(field)}: ${d.msg ?? "invalid"}`;
        })
        .join("; ");
    } else if (detail) {
      message = JSON.stringify(detail);
    } else {
      message = error.message ?? "An unexpected error occurred";
    }

    return Promise.reject(new Error(message));
  },
);