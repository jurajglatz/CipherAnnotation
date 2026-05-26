import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBoxMove } from './useBoxMove';

describe('useBoxMove.updateForCursor', () => {
  const args = { pageWidth: 100, pageHeight: 100 };

  it('preview starts null and stays null without begin()', () => {
    const { result } = renderHook(() => useBoxMove(args));
    act(() => result.current.updateForCursor(50, 50));
    expect(result.current.preview).toBeNull();
  });

  it('translates the box by (cursor - offset)', () => {
    const { result } = renderHook(() => useBoxMove(args));
    const orig = { x: 10, y: 10, width: 20, height: 20 };

    act(() => result.current.begin('id', orig, 5, 5, new Map()));
    act(() => result.current.updateForCursor(30, 40));

    expect(result.current.preview).toEqual({ ...orig, x: 25, y: 35 });
  });

  it('clamps at the top-left edge', () => {
    const { result } = renderHook(() => useBoxMove(args));
    const orig = { x: 0, y: 0, width: 20, height: 20 };

    act(() => result.current.begin('id', orig, 0, 0, new Map()));
    act(() => result.current.updateForCursor(-50, -50));

    expect(result.current.preview).toEqual({ ...orig, x: 0, y: 0 });
  });

  it('clamps at the bottom-right edge', () => {
    const { result } = renderHook(() => useBoxMove(args));
    const orig = { x: 0, y: 0, width: 20, height: 20 };

    act(() => result.current.begin('id', orig, 0, 0, new Map()));
    act(() => result.current.updateForCursor(500, 500));

    expect(result.current.preview).toEqual({ ...orig, x: 80, y: 80 });
  });

  it('reset() returns preview to null and isMoving to false', () => {
    const { result } = renderHook(() => useBoxMove(args));
    const orig = { x: 0, y: 0, width: 10, height: 10 };
    act(() => result.current.begin('id', orig, 0, 0, new Map()));
    act(() => result.current.updateForCursor(50, 50));

    act(() => result.current.reset());

    expect(result.current.preview).toBeNull();
    expect(result.current.moving.isMoving).toBe(false);
  });
});
