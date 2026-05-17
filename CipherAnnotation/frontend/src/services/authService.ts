/**
 * Authentication service
 * Manages access/refresh tokens and exposes login/register/refresh/logout.
 */

import axios from 'axios';
import api from './api';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

const ACCESS_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const EXPIRES_KEY = 'accessTokenExpiresAt';
const USER_KEY = 'user';
const LEGACY_TOKEN_KEY = 'authToken';

// Separate axios instance so /auth/refresh isn't intercepted by api.ts.
const bareApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

class AuthService {
  constructor() {
    // Drop any leftover from the pre-refresh-token version.
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await bareApi.post<AuthResponse>('/auth/login', data);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await bareApi.post<AuthResponse>('/auth/register', data);
    return response.data;
  }

  async googleLogin(idToken: string): Promise<AuthResponse> {
    const response = await bareApi.post<AuthResponse>('/auth/google-login', { idToken });
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response.data;
  }

  /**
   * Exchange the current refresh token for a fresh pair.
   * Persists the new tokens. Throws on failure.
   */
  async refresh(): Promise<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const response = await bareApi.post<AuthResponse>('/auth/refresh', { refreshToken });
    this.saveAuth(response.data);
    return response.data;
  }

  /**
   * Best-effort: revoke the refresh token server-side, then clear local storage.
   */
  async logout(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      try {
        await bareApi.post('/auth/logout', { refreshToken });
      } catch {
        // Ignore — we're clearing local state regardless.
      }
    }
    this.clear();
  }

  saveAuth(response: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, response.accessToken);
    localStorage.setItem(REFRESH_KEY, response.refreshToken);
    localStorage.setItem(EXPIRES_KEY, response.accessTokenExpiresAt);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }

  saveUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  }

  /** Returns the access-token expiry as epoch ms, or null. */
  getAccessExpiresAtMs(): number | null {
    const raw = localStorage.getItem(EXPIRES_KEY);
    if (!raw) return null;
    const t = Date.parse(raw);
    return Number.isNaN(t) ? null : t;
  }

  getStoredUser(): User | null {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export default new AuthService();
