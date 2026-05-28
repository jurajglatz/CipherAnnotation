import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/services', () => ({
  pageService: {
    getPreprocessHistory: vi.fn(),
    preprocessPage: vi.fn(),
    applyPreprocessToAllPages: vi.fn(),
    undoPreprocess: vi.fn(),
    redoPreprocess: vi.fn(),
    resetPreprocessing: vi.fn(),
  },
}));

import { usePreprocess } from './usePreprocess';
import { pageService } from '@/services';

const ps = pageService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const baseArgs = {
  documentId: 'doc-1',
  pageId: 'page-1',
  pageCount: 3,
  onPageRefetch: vi.fn(async () => {}),
};

describe('usePreprocess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ps.getPreprocessHistory.mockResolvedValue({ entries: [] });
  });

  it('open/close toggle isOpen and clear ops on close', () => {
    const { result } = renderHook(() => usePreprocess(baseArgs));
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.setOps([{ name: 'grayscale' }]));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.ops).toEqual([]);
  });

  it('save() is a no-op when ops list is empty', async () => {
    const { result } = renderHook(() => usePreprocess(baseArgs));
    await act(async () => { await result.current.save(); });
    expect(ps.preprocessPage).not.toHaveBeenCalled();
  });

  it('save() applies ops, refetches page + history, and offers apply-to-all when pageCount > 1', async () => {
    ps.preprocessPage.mockResolvedValue(undefined);
    ps.getPreprocessHistory.mockResolvedValue({ entries: [{ id: 'h1' }] });

    const { result } = renderHook(() => usePreprocess(baseArgs));
    act(() => result.current.setOps([{ name: 'scale', value: 2 }]));
    await act(async () => { await result.current.save(); });

    expect(ps.preprocessPage).toHaveBeenCalledWith('doc-1', 'page-1', [{ name: 'scale', value: 2 }]);
    expect(baseArgs.onPageRefetch).toHaveBeenCalled();
    expect(result.current.history).toEqual([{ id: 'h1' }]);
    expect(result.current.applyAllPrompt).toEqual({ ops: [{ name: 'scale', value: 2 }] });
  });

  it('save() does NOT offer apply-to-all for single-page docs', async () => {
    ps.preprocessPage.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePreprocess({ ...baseArgs, pageCount: 1 }));
    act(() => result.current.setOps([{ name: 'grayscale' }]));
    await act(async () => { await result.current.save(); });
    expect(result.current.applyAllPrompt).toBeNull();
  });

  it('confirmApplyToAll() runs and refetches', async () => {
    ps.preprocessPage.mockResolvedValue(undefined);
    ps.applyPreprocessToAllPages.mockResolvedValue({ appliedCount: 3, failedCount: 0 });

    const { result } = renderHook(() => usePreprocess(baseArgs));
    act(() => result.current.setOps([{ name: 'grayscale' }]));
    await act(async () => { await result.current.save(); });
    expect(result.current.applyAllPrompt).not.toBeNull();

    await act(async () => { await result.current.confirmApplyToAll(); });
    expect(ps.applyPreprocessToAllPages).toHaveBeenCalledWith('doc-1', [{ name: 'grayscale' }]);
    expect(result.current.applyAllPrompt).toBeNull();
  });

  it('undo/redo/reset call the corresponding service method', async () => {
    ps.undoPreprocess.mockResolvedValue(undefined);
    ps.redoPreprocess.mockResolvedValue(undefined);
    ps.resetPreprocessing.mockResolvedValue(undefined);

    const { result } = renderHook(() => usePreprocess(baseArgs));
    await act(async () => { await result.current.undo(); });
    await act(async () => { await result.current.redo(); });
    await act(async () => { await result.current.reset(); });

    expect(ps.undoPreprocess).toHaveBeenCalledWith('doc-1', 'page-1');
    expect(ps.redoPreprocess).toHaveBeenCalledWith('doc-1', 'page-1');
    expect(ps.resetPreprocessing).toHaveBeenCalledWith('doc-1', 'page-1');
  });

  it('dismissApplyAll() clears the prompt', async () => {
    ps.preprocessPage.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePreprocess(baseArgs));
    act(() => result.current.setOps([{ name: 'x' }]));
    await act(async () => { await result.current.save(); });
    act(() => result.current.dismissApplyAll());
    expect(result.current.applyAllPrompt).toBeNull();
  });
});
