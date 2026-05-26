import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
}));

import { useAnnotationHistory, type HistoryCommand } from './useAnnotationHistory';

function makeCmd() {
  const undo = vi.fn(async () => {});
  const redo = vi.fn(async () => {});
  return { undo, redo } as HistoryCommand & { undo: ReturnType<typeof vi.fn>; redo: ReturnType<typeof vi.fn> };
}

describe('useAnnotationHistory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('starts with no undo/redo available', () => {
    const { result } = renderHook(() => useAnnotationHistory('page-1'));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('pushCommand enables undo, undo calls cmd.undo()', async () => {
    const { result } = renderHook(() => useAnnotationHistory('page-1'));
    const cmd = makeCmd();

    act(() => result.current.pushCommand(cmd));
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    await act(async () => { await result.current.handleUndo(); });
    expect(cmd.undo).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo replays the undone command', async () => {
    const { result } = renderHook(() => useAnnotationHistory('p'));
    const cmd = makeCmd();
    act(() => result.current.pushCommand(cmd));
    await act(async () => { await result.current.handleUndo(); });

    await act(async () => { await result.current.handleRedo(); });

    expect(cmd.redo).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('undo at start of history is a no-op', async () => {
    const { result } = renderHook(() => useAnnotationHistory('p'));

    await act(async () => { await result.current.handleUndo(); });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('pushing after undo clears the redo stack', async () => {
    const { result } = renderHook(() => useAnnotationHistory('p'));
    const c1 = makeCmd();
    const c2 = makeCmd();
    const c3 = makeCmd();

    act(() => result.current.pushCommand(c1));
    act(() => result.current.pushCommand(c2));
    await act(async () => { await result.current.handleUndo(); });
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.pushCommand(c3));
    expect(result.current.canRedo).toBe(false);

    await act(async () => { await result.current.handleRedo(); });
    expect(c2.redo).not.toHaveBeenCalled();
  });

  it('changing resetKey clears the history', async () => {
    const { result, rerender } = renderHook(
      ({ k }: { k: string }) => useAnnotationHistory(k),
      { initialProps: { k: 'a' } },
    );
    act(() => result.current.pushCommand(makeCmd()));
    expect(result.current.canUndo).toBe(true);

    rerender({ k: 'b' });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('resolveId follows the remap chain', () => {
    const { result } = renderHook(() => useAnnotationHistory('p'));

    act(() => {
      result.current.remapId('old', 'mid');
      result.current.remapId('mid', 'new');
    });

    expect(result.current.resolveId('old')).toBe('new');
    expect(result.current.resolveId('unknown')).toBe('unknown');
  });
});
