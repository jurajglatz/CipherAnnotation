import { describe, it, expect, beforeEach, vi } from 'vitest';

// bareApi inside authService is built with axios.create(); api (for getMe) is a
// separate instance. Mock both so no real HTTP happens. vi.hoisted lets the
// stub exist before the hoisted vi.mock factory runs.
const { bareApi } = vi.hoisted(() => ({
  bareApi: { post: vi.fn(), get: vi.fn() },
}));

vi.mock('axios', () => ({
  default: { create: vi.fn(() => bareApi) },
}));

vi.mock('./api', () => ({
  default: { get: vi.fn() },
}));

import authService from './authService';
import api from './api';
import type { AuthResponse, User } from '../types';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const user = { id: 'u1', email: 'a@b.c', name: 'Alice' } as unknown as User;
const authResponse: AuthResponse = {
  accessToken: 'tok',
  accessTokenExpiresAt: '2026-01-01T00:00:00Z',
  user,
} as unknown as AuthResponse;

describe('authService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('network calls', () => {
    it('login POSTs /auth/login and returns the response data', async () => {
      bareApi.post.mockResolvedValue({ data: authResponse });
      const res = await authService.login({ email: 'a@b.c', password: 'p' } as never);
      expect(res).toEqual(authResponse);
      expect(bareApi.post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.c', password: 'p' });
    });

    it('register POSTs /auth/register', async () => {
      bareApi.post.mockResolvedValue({ data: authResponse });
      await authService.register({ email: 'a@b.c', password: 'p', name: 'A' } as never);
      expect(bareApi.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ email: 'a@b.c' }));
    });

    it('googleLogin POSTs the idToken', async () => {
      bareApi.post.mockResolvedValue({ data: authResponse });
      await authService.googleLogin('id-123');
      expect(bareApi.post).toHaveBeenCalledWith('/auth/google-login', { idToken: 'id-123' });
    });

    it('getMe GETs /auth/me via the intercepted api instance', async () => {
      mockedApi.get.mockResolvedValue({ data: user });
      const res = await authService.getMe();
      expect(res).toEqual(user);
      expect(mockedApi.get).toHaveBeenCalledWith('/auth/me');
    });

    it('refresh POSTs /auth/refresh and persists the new auth', async () => {
      bareApi.post.mockResolvedValue({ data: authResponse });
      const res = await authService.refresh();
      expect(res).toEqual(authResponse);
      expect(localStorage.getItem('accessToken')).toBe('tok');
      expect(localStorage.getItem('accessTokenExpiresAt')).toBe('2026-01-01T00:00:00Z');
      expect(JSON.parse(localStorage.getItem('user')!)).toEqual(user);
    });

    it('logout revokes server-side then clears local state', async () => {
      bareApi.post.mockResolvedValue({ data: {} });
      authService.saveAuth(authResponse);
      await authService.logout();
      expect(bareApi.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorage.getItem('accessToken')).toBeNull();
    });

    it('logout clears local state even if the server call fails', async () => {
      bareApi.post.mockRejectedValue(new Error('boom'));
      authService.saveAuth(authResponse);
      await expect(authService.logout()).resolves.toBeUndefined();
      expect(localStorage.getItem('accessToken')).toBeNull();
    });
  });

  describe('token storage helpers', () => {
    it('saveAuth writes token, expiry and serialized user', () => {
      authService.saveAuth(authResponse);
      expect(authService.getAccessToken()).toBe('tok');
      expect(authService.getStoredUser()).toEqual(user);
    });

    it('saveUser updates only the stored user', () => {
      const next = { ...user, name: 'Bob' } as User;
      authService.saveUser(next);
      expect(authService.getStoredUser()).toEqual(next);
    });

    it('clear removes all auth keys', () => {
      authService.saveAuth(authResponse);
      authService.clear();
      expect(authService.getAccessToken()).toBeNull();
      expect(authService.getStoredUser()).toBeNull();
    });

    it('getAccessExpiresAtMs parses an ISO date to epoch ms', () => {
      authService.saveAuth(authResponse);
      expect(authService.getAccessExpiresAtMs()).toBe(Date.parse('2026-01-01T00:00:00Z'));
    });

    it('getAccessExpiresAtMs returns null when absent or unparseable', () => {
      expect(authService.getAccessExpiresAtMs()).toBeNull();
      localStorage.setItem('accessTokenExpiresAt', 'not-a-date');
      expect(authService.getAccessExpiresAtMs()).toBeNull();
    });

    it('getStoredUser returns null when nothing is stored', () => {
      expect(authService.getStoredUser()).toBeNull();
    });

    it('isAuthenticated reflects token presence', () => {
      expect(authService.isAuthenticated()).toBe(false);
      authService.saveAuth(authResponse);
      expect(authService.isAuthenticated()).toBe(true);
    });
  });
});
