/**
 * Authentication service
 * Manages access tokens (in memory + localStorage for survival across reloads)
 * and exposes login/register/refresh/logout. The refresh token lives in an
 * httpOnly Secure SameSite=Strict cookie set by the API — JS never sees it.
 */

import axios from 'axios';
import api from './api';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';

const ACCESS_KEY = 'accessToken';
const EXPIRES_KEY = 'accessTokenExpiresAt';
const USER_KEY = 'user';
const LEGACY_TOKEN_KEY = 'authToken';
const LEGACY_REFRESH_KEY = 'refreshToken';

// Separate axios instance so /auth/refresh isn't intercepted by api.ts.
// withCredentials lets the browser attach the refresh cookie on cross-origin
// dev requests (Vite on :5173 calling the API on :5000).
const bareApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

class AuthService {
  constructor() {
    // Drop leftovers from older versions that stored the refresh token in JS.
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_REFRESH_KEY);
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
   * Exchange the refresh cookie for a fresh access token. Throws on failure.
   */
  async refresh(): Promise<AuthResponse> {
    const response = await bareApi.post<AuthResponse>('/auth/refresh');
    this.saveAuth(response.data);
    return response.data;
  }

  /**
   * Best-effort: revoke the refresh cookie server-side, then clear local state.
   */
  async logout(): Promise<void> {
    try {
      await bareApi.post('/auth/logout');
    } catch {
      // Ignore — we're clearing local state regardless.
    }
    this.clear();
  }

  saveAuth(response: AuthResponse): void {
    localStorage.setItem(ACCESS_KEY, response.accessToken);
    localStorage.setItem(EXPIRES_KEY, response.accessTokenExpiresAt);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
  }

  saveUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
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
