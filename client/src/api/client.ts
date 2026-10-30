import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { AuthResponse } from "../types.js";

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:5055";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
  headers: {
    "Content-Type": "application/json",
  },
});

export const evalApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 180_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Storage helper restricted strictly to allowed keys
export const authStorage = {
  getToken: () => localStorage.getItem("vs_token"),
  getRefreshToken: () => localStorage.getItem("vs_refresh"),
  getExpiresAt: () => {
    const exp = localStorage.getItem("vs_exp");
    return exp ? parseInt(exp, 10) : 0;
  },
  setAuth: (data: AuthResponse) => {
    localStorage.setItem("vs_token", data.token);
    localStorage.setItem("vs_refresh", data.refreshToken);
    localStorage.setItem("vs_exp", data.expiresAt.toString());
  },
  clearAuth: () => {
    localStorage.removeItem("vs_token");
    localStorage.removeItem("vs_refresh");
    localStorage.removeItem("vs_exp");
    window.dispatchEvent(new CustomEvent("verishield:logout"));
  },
};

// Single-flight promise for token refresh
let refreshPromise: Promise<string | null> | null = null;

async function refreshAuthToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = authStorage.getRefreshToken();
  if (!refreshToken) {
    authStorage.clearAuth();
    return null;
  }

  refreshPromise = (async () => {
    try {
      const resp = await axios.post<AuthResponse>(`${API_BASE_URL}/api/auth/refresh`, {
        refreshToken,
      });
      authStorage.setAuth(resp.data);
      return resp.data.token;
    } catch {
      authStorage.clearAuth();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Request interceptor: add Bearer token and proactively refresh if <60s left
const attachAuthInterceptor = (config: InternalAxiosRequestConfig) => {
  const token = authStorage.getToken();
  const exp = authStorage.getExpiresAt();
  const now = Math.floor(Date.now() / 1000);

  if (token && exp && exp - now < 60) {
    // Proactively refresh in background
    refreshAuthToken().catch(() => {});
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

apiClient.interceptors.request.use(attachAuthInterceptor);
evalApiClient.interceptors.request.use(attachAuthInterceptor);

// Response interceptor: handle 401 with retry
const attachResponseInterceptor = (instance: typeof apiClient) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        // Do not intercept login or refresh failures themselves
        if (originalRequest.url?.includes("/api/auth/")) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;
        const newToken = await refreshAuthToken();
        if (newToken && originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return instance(originalRequest);
        }
      }
      return Promise.reject(error);
    }
  );
};

attachResponseInterceptor(apiClient);
attachResponseInterceptor(evalApiClient);

