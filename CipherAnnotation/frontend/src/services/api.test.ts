import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

vi.mock('./authService', () => ({
  default: {
    getAccessToken: vi.fn(),
    getAccessExpiresAtMs: vi.fn(),
    refresh: vi.fn(),
    clear: vi.fn(),
  },
}));

import api from './api';
import authService from './authService';

const mockedAuth = authService as unknown as {
  getAccessToken: ReturnType<typeof vi.fn>;
  getAccessExpiresAtMs: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  clear: ReturnType<typeof vi.fn>;
};

describe('api (JWT interceptors)', () => {
  let mock: MockAdapter;
  const originalLocation = window.location;

  beforeEach(() => {
    mock = new MockAdapter(api);
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { pathname: '/somewhere', href: '/somewhere' },
    });
  });

  afterEach(() => {
    mock.restore();
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('attaches Authorization header when a fresh token exists', async () => {
    mockedAuth.getAccessToken.mockReturnValue('tok-1');
    mockedAuth.getAccessExpiresAtMs.mockReturnValue(Date.now() + 60_000);
    mock.onGet('/x').reply(200, { ok: true });

    const res = await api.get('/x');

    expect(res.status).toBe(200);
    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer tok-1');
    expect(mockedAuth.refresh).not.toHaveBeenCalled();
  });

  it('refreshes the token if within the 30s leeway', async () => {
    mockedAuth.getAccessToken.mockReturnValue('tok-old');
    mockedAuth.getAccessExpiresAtMs.mockReturnValue(Date.now() + 10_000);
    mockedAuth.refresh.mockResolvedValue({ accessToken: 'tok-new' });
    mock.onGet('/x').reply(200, { ok: true });

    const res = await api.get('/x');

    expect(res.status).toBe(200);
    expect(mockedAuth.refresh).toHaveBeenCalledTimes(1);
    expect(mock.history.get[0].headers?.Authorization).toBe('Bearer tok-new');
  });

  it('sends no Authorization header when there is no token', async () => {
    mockedAuth.getAccessToken.mockReturnValue(null);
    mockedAuth.getAccessExpiresAtMs.mockReturnValue(null);
    mock.onGet('/x').reply(200, { ok: true });

    await api.get('/x');

    expect(mock.history.get[0].headers?.Authorization).toBeUndefined();
    expect(mockedAuth.refresh).not.toHaveBeenCalled();
  });

  it('on a 401 attempts one refresh + retry with the new token', async () => {
    // First call returns the old token (fresh, so request interceptor won't proactively refresh).
    // After the 401 response interceptor triggers refresh, getAccessToken returns the new token
    // for the retry's request interceptor pass.
    mockedAuth.getAccessToken
      .mockReturnValueOnce('tok-old')
      .mockReturnValue('tok-new');
    mockedAuth.getAccessExpiresAtMs.mockReturnValue(Date.now() + 60_000);
    mockedAuth.refresh.mockResolvedValue({ accessToken: 'tok-new' });

    let call = 0;
    mock.onGet('/x').reply(() => {
      call += 1;
      return call === 1 ? [401, {}] : [200, { ok: true }];
    });

    const res = await api.get('/x');

    expect(res.status).toBe(200);
    expect(mockedAuth.refresh).toHaveBeenCalledTimes(1);
    expect(mock.history.get).toHaveLength(2);
    expect(mock.history.get[1].headers?.Authorization).toBe('Bearer tok-new');
  });

  it('on 401 + refresh failure, clears auth and redirects to /login', async () => {
    mockedAuth.getAccessToken.mockReturnValue('tok-old');
    mockedAuth.getAccessExpiresAtMs.mockReturnValue(Date.now() + 60_000);
    mockedAuth.refresh.mockRejectedValue(new Error('refresh failed'));
    mock.onGet('/x').reply(401, {});

    await expect(api.get('/x')).rejects.toBeDefined();

    expect(mockedAuth.clear).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });

  it('does not redirect if already on /login', async () => {
    mockedAuth.getAccessToken.mockReturnValue('tok-old');
    mockedAuth.getAccessExpiresAtMs.mockReturnValue(Date.now() + 60_000);
    mockedAuth.refresh.mockRejectedValue(new Error('refresh failed'));
    mock.onGet('/x').reply(401, {});
    (window.location as { pathname: string; href: string }).pathname = '/login';
    (window.location as { pathname: string; href: string }).href = '/login';

    await expect(api.get('/x')).rejects.toBeDefined();

    expect(mockedAuth.clear).toHaveBeenCalled();
    expect(window.location.href).toBe('/login');
  });
});
