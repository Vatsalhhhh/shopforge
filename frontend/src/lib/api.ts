/**
 * Typed Axios client with automatic JWT handling.
 * - Attaches Authorization header from authStore on every request
 * - On 401, attempts token refresh once before redirecting to login
 */
import axios, { AxiosError, type AxiosInstance } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ── Request interceptor — attach access token ────────────────────
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    // Dynamically import to avoid circular deps
    const { useAuthStore } = require("@/store/authStore");
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ── Response interceptor — handle token refresh on 401 ──────────
let isRefreshing = false;
let pendingRequests: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original?._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve) => {
          pendingRequests.push((token) => {
            if (original) original.headers!["Authorization"] = `Bearer ${token}`;
            resolve(api(original!));
          });
        });
      }

      original!._retry = true;
      isRefreshing = true;

      try {
        const { useAuthStore } = require("@/store/authStore");
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          // No session to refresh — propagate 401 to the calling component
          isRefreshing = false;
          return Promise.reject(error);
        }

        const res = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        const { access_token } = res.data;

        useAuthStore.getState().setTokens(access_token, refreshToken);
        pendingRequests.forEach((cb) => cb(access_token));
        pendingRequests = [];

        original!.headers!["Authorization"] = `Bearer ${access_token}`;
        return api(original!);
      } catch {
        // Refresh attempt failed — session truly expired, redirect to login
        const { useAuthStore } = require("@/store/authStore");
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login?expired=1";
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/** Extract a human-readable error message from an API error. */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.detail === "string") return data.detail;
    if (Array.isArray(data?.detail)) {
      return data.detail.map((d: { msg: string }) => d.msg).join(", ");
    }
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

export default api;
