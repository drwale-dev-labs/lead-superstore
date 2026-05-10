import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  // Set JSON content-type only if we're not sending FormData.
  // FormData needs the browser to set its own multipart boundary.
  if (!(config.data instanceof FormData)) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail;
    let message: string;

    if (typeof detail === "string") {
      // Most of our handlers raise HTTPException(detail="...") — string detail.
      message = detail;
    } else if (Array.isArray(detail)) {
      // FastAPI 422: array of {loc, msg, type, ...}. Surface field + reason.
      message = detail
        .map((d: { msg?: string; loc?: (string | number)[] }) => {
          const field = d.loc?.slice(-1)[0] ?? "field";
          return `${String(field)}: ${d.msg ?? "invalid"}`;
        })
        .join("; ");
    } else if (detail) {
      // Unknown structured error — stringify so we don't render [object Object].
      message = JSON.stringify(detail);
    } else {
      message = error.message ?? "An unexpected error occurred";
    }

    return Promise.reject(new Error(message));
  },
);