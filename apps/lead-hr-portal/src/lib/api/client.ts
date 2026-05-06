import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Request interceptor — for adding auth tokens later
apiClient.interceptors.request.use((config) => {
  // Auth bearer token will go here once we wire up Supabase Auth
  return config;
});

// Response interceptor — surface backend errors with their detail message
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ??
      error.message ??
      "An unexpected error occurred";
    return Promise.reject(new Error(message));
  },
);