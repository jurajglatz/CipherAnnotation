import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../services/captionService', () => ({
  default: {
    list: vi.fn(),
    create: vi.fn(),
    rename: vi.fn(),
    remove: vi.fn(),
  },
}));

import { useCaptions } from './useCaptions';
import captionService from '../services/captionService';
import type { Caption } from '../types';

const mocked = captionService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const cap = (id: string, name = 'C'): Caption => ({ id, name } as unknown as Caption);

describe('useCaptions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty when documentId is null and does not fetch', async () => {
    const { result } = renderHook(() => useCaptions(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mocked.list).not.toHaveBeenCalled();
    expect(result.current.captions).toEqual([]);
  });

  it('loads captions on mount', async () => {
    mocked.list.mockResolvedValue([cap('1'), cap('2')]);
    const { result } = renderHook(() => useCaptions('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.captions).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('records error message on load failure', async () => {
    mocked.list.mockRejectedValue({ response: { data: { message: 'fail' } } });
    const { result } = renderHook(() => useCaptions('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('fail');
  });

  it('create() appends to the list', async () => {
    mocked.list.mockResolvedValue([cap('1')]);
    mocked.create.mockResolvedValue(cap('2', 'new'));

    const { result } = renderHook(() => useCaptions('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.create('new'); });

    expect(mocked.create).toHaveBeenCalledWith('doc-1', 'new');
    expect(result.current.captions.map((c) => c.id)).toEqual(['1', '2']);
  });

  it('rename() replaces in place', async () => {
    mocked.list.mockResolvedValue([cap('1', 'old')]);
    mocked.rename.mockResolvedValue(cap('1', 'new'));

    const { result } = renderHook(() => useCaptions('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.rename('1', 'new'); });

    expect(result.current.captions[0].name).toBe('new');
  });

  it('remove() filters out the deleted id', async () => {
    mocked.list.mockResolvedValue([cap('1'), cap('2')]);
    mocked.remove.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCaptions('doc-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.remove('1'); });

    expect(result.current.captions.map((c) => c.id)).toEqual(['2']);
  });
});
