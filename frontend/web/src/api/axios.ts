import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import type { ApiResponse } from '../types';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

type RetryableRequest = {
  _retry?: boolean;
  headers?: Record<string, string>;
  url?: string;
};

let refreshRequest: Promise<string> | null = null;

const refreshAccessToken = async () => {
  if (!refreshRequest) {
    refreshRequest = apiClient
      .post<ApiResponse<{ accessToken: string }>>('/auth/refresh')
      .then(({ data }) => {
        const accessToken = data.data.accessToken;
        useAuthStore.getState().setToken(accessToken);
        return accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

// ─── Request Interceptor: يُضيف Access Token تلقائياً ────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor: يعالج انتهاء الجلسة ──────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config as RetryableRequest | undefined;
    const url = request?.url ?? '';
    const isAuthBootstrapRequest = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
    ].some((path) => url.includes(path));

    if (
      error.response?.status === 401 &&
      request &&
      !request._retry &&
      !isAuthBootstrapRequest &&
      useAuthStore.getState().isAuthenticated
    ) {
      request._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        request.headers = {
          ...request.headers,
          Authorization: `Bearer ${accessToken}`,
        };
        return apiClient(request);
      } catch {
        useAuthStore.getState().logout();
      }
    }

    if (error.response?.status === 401 && !isAuthBootstrapRequest) {
      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
