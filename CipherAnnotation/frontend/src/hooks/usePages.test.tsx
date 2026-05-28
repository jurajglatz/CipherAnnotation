import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../services/pageService', () => ({
  default: {
    getPages: vi.fn(),
    getPage: vi.fn(),
    preprocessPage: vi.fn(),
  },
}));

import { usePages } from './usePages';
import pageService from '../services/pageService';
import type { Page } from '../types';

const mocked = pageService as unknown as Record<string, ReturnType<typeof vi.fn>>;
const page = (id: string, n = 1): Page => ({ id, pageNumber: n } as unknown as Page);

describe('usePages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts empty and does not auto-load', () => {
    const { result } = renderHook(() => usePages());
    expect(result.current.pages).toEqual([]);
    expect(result.current.currentPage).toBeNull();
    expect(mocked.getPages).not.toHaveBeenCalled();
  });

  it('fetchPages populates the list', async () => {
    mocked.getPages.mockResolvedValue([page('1'), page('2', 2)]);
    const { result } = renderHook(() => usePages());

    await act(async () => { await result.current.fetchPages('doc'); });

    expect(result.current.pages).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('fetchPage sets currentPage and updates the list entry', async () => {
    mocked.getPages.mockResolvedValue([page('1'), page('2', 2)]);
    mocked.getPage.mockResolvedValue(page('2', 99));

    const { result } = renderHook(() => usePages());
    await act(async () => { await result.current.fetchPages('doc'); });
    await act(async () => { await result.current.fetchPage('doc', '2'); });

    expect(result.current.currentPage?.id).toBe('2');
    expect(result.current.pages.find((p) => p.id === '2')?.pageNumber).toBe(99);
  });

  it('preprocessPage sets currentPage and updates the list entry', async () => {
    mocked.getPages.mockResolvedValue([page('1')]);
    mocked.preprocessPage.mockResolvedValue(page('1', 7));

    const { result } = renderHook(() => usePages());
    await act(async () => { await result.current.fetchPages('doc'); });
    await act(async () => { await result.current.preprocessPage('doc', '1', [{ name: 'grayscale' }]); });

    expect(result.current.currentPage?.pageNumber).toBe(7);
  });

  it('setCurrentPage replaces currentPage', () => {
    const { result } = renderHook(() => usePages());
    act(() => result.current.setCurrentPage(page('z')));
    expect(result.current.currentPage?.id).toBe('z');

    act(() => result.current.setCurrentPage(null));
    expect(result.current.currentPage).toBeNull();
  });

  it('error path sets error and rethrows', async () => {
    mocked.getPages.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePages());

    let thrown: unknown;
    await act(async () => {
      try { await result.current.fetchPages('doc'); }
      catch (e) { thrown = e; }
    });

    expect((thrown as Error).message).toBe('boom');
    expect(result.current.error).toBe('boom');

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});
