/**
 * Axios instance with JWT interceptors.
 * - Request: ensures the access token is fresh; if it's within 30s of expiry,
 *   refreshes it first (single-flight).
 * - Response: on a 401, attempts one refresh + retry. If the refresh fails too,
 *   clears storage and redirects to /login.
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import authService from './authService';

const REFRESH_LEEWAY_MS = 30_000;

const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string> | null = null;

async function ensureFreshAccessToken(): Promise<string | null> {
  const access = authService.getAccessToken();
  const expiresAt = authService.getAccessExpiresAtMs();

  if (!access) return null;
  if (expiresAt && Date.now() < expiresAt - REFRESH_LEEWAY_MS) return access;
  if (!authService.getRefreshToken()) return access;

  if (!refreshPromise) {
    refreshPromise = authService
      .refresh()
      .then((r) => r.accessToken)
      .finally(() => {
        refreshPromise = null;
      });
  }

  try {
    return await refreshPromise;
  } catch {
    return null;
  }
}

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await ensureFreshAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetryableConfig | undefined;

    if (status === 401 && original && !original._retried) {
      original._retried = true;

      if (!refreshPromise) {
        refreshPromise = authService
          .refresh()
          .then((r) => r.accessToken)
          .finally(() => {
            refreshPromise = null;
          });
      }

      try {
        const newToken = await refreshPromise;
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newToken}`;
        return api.request(original);
      } catch {
        authService.clear();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    if (status === 401) {
      authService.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (status === 403) {
      console.error('Access forbidden:', error.response?.data);
    }

    if (status === 500) {
      console.error('Server error:', error.response?.data);
    }

    return Promise.reject(error);
  },
);

export default api;
