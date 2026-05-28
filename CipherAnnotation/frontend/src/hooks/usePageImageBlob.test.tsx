import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/services/api', () => ({
  default: { get: vi.fn() },
}));

import { usePageImageBlob } from './usePageImageBlob';
import api from '@/services/api';
import type { Page } from '@/types';

const mockedApi = api as unknown as { get: ReturnType<typeof vi.fn> };

const page = (over: Partial<Page> = {}): Page =>
  ({ id: 'p', imageUrl: '/img/raw.png', processedImageUrl: '/img/processed.png', ...over } as unknown as Page);

describe('usePageImageBlob', () => {
  const created: string[] = [];
  const revoked: string[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    created.length = 0;
    revoked.length = 0;
    (URL.createObjectURL as unknown) = vi.fn(() => {
      const u = `blob:${created.length}`;
      created.push(u);
      return u;
    });
    (URL.revokeObjectURL as unknown) = vi.fn((u: string) => {
      revoked.push(u);
    });
  });

  it('fetches raw image when showProcessed is false', async () => {
    mockedApi.get.mockResolvedValue({ data: new Blob(['x']) });

    const { result } = renderHook(() => usePageImageBlob(page(), false));

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(mockedApi.get).toHaveBeenCalledWith('/img/raw.png', { responseType: 'blob' });
    expect(result.current).toMatch(/^blob:/);
  });

  it('fetches processed image when showProcessed is true and processed exists', async () => {
    mockedApi.get.mockResolvedValue({ data: new Blob(['x']) });
    const { result } = renderHook(() => usePageImageBlob(page(), true));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(mockedApi.get).toHaveBeenCalledWith('/img/processed.png', { responseType: 'blob' });
  });

  it('falls back to raw imageUrl when processedImageUrl is missing', async () => {
    mockedApi.get.mockResolvedValue({ data: new Blob(['x']) });
    const { result } = renderHook(() =>
      usePageImageBlob(page({ processedImageUrl: undefined }), true),
    );
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(mockedApi.get).toHaveBeenCalledWith('/img/raw.png', { responseType: 'blob' });
  });

  it('does nothing when there is no image URL at all', () => {
    const { result } = renderHook(() =>
      usePageImageBlob(page({ imageUrl: undefined, processedImageUrl: undefined }), false),
    );
    expect(result.current).toBeNull();
    expect(mockedApi.get).not.toHaveBeenCalled();
  });
});
