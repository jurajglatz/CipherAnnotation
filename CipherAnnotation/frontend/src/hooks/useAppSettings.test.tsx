import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const useAuthMock = vi.fn();
vi.mock('./useAuth', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/services/settingsService', () => ({
  default: {
    getPublic: vi.fn(),
  },
}));

import { useAppSettings } from './useAppSettings';
import settingsService from '@/services/settingsService';

const mocked = settingsService as unknown as { getPublic: ReturnType<typeof vi.fn> };

describe('useAppSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ user: null });
  });

  it('returns defaults and does not fetch when user is null', async () => {
    const { result } = renderHook(() => useAppSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.settings).toEqual({ autoContentGenerator: false });
    expect(mocked.getPublic).not.toHaveBeenCalled();
  });

  it('fetches public settings when a user is present', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    mocked.getPublic.mockResolvedValue({ autoContentGenerator: true });

    const { result } = renderHook(() => useAppSettings());
    await waitFor(() => expect(result.current.settings.autoContentGenerator).toBe(true));
  });

  it('falls back to defaults if the service throws', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    mocked.getPublic.mockRejectedValue(new Error('x'));

    const { result } = renderHook(() => useAppSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.settings).toEqual({ autoContentGenerator: false });
  });

  it('reload() re-fetches', async () => {
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    mocked.getPublic.mockResolvedValueOnce({ autoContentGenerator: false });

    const { result } = renderHook(() => useAppSettings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocked.getPublic.mockResolvedValueOnce({ autoContentGenerator: true });
    await act(async () => { await result.current.reload(); });

    expect(result.current.settings.autoContentGenerator).toBe(true);
    expect(mocked.getPublic).toHaveBeenCalledTimes(2);
  });
});
