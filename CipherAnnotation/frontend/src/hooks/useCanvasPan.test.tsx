import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useCanvasPan } from './useCanvasPan';

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  Object.defineProperty(div, 'scrollLeft', { writable: true, value: 50 });
  Object.defineProperty(div, 'scrollTop', { writable: true, value: 60 });
  return div;
}

function fakeReactMouse(x: number, y: number): React.MouseEvent {
  return { clientX: x, clientY: y } as unknown as React.MouseEvent;
}

describe('useCanvasPan', () => {
  let container: HTMLDivElement;
  let ref: React.RefObject<HTMLDivElement>;

  beforeEach(() => {
    container = makeContainer();
    ref = { current: container };
  });

  it('sets modifierHeld when Ctrl/Meta is pressed and clears on release', () => {
    const { result } = renderHook(() => useCanvasPan({ containerRef: ref }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'Control' }));
    });
    expect(result.current.modifierHeld).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { ctrlKey: false, key: 'Control' }));
    });
    expect(result.current.modifierHeld).toBe(false);
  });

  it('startPan() with no movement past threshold leaves isPanning false and triggers onIdleUp', () => {
    const { result } = renderHook(() => useCanvasPan({ containerRef: ref }));
    const onIdleUp = vi.fn();

    act(() => {
      result.current.startPan(fakeReactMouse(100, 100), onIdleUp);
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    expect(result.current.isPanning).toBe(false);
    expect(onIdleUp).toHaveBeenCalledTimes(1);
  });

  it('startPan() with movement past threshold activates panning and scrolls the container', () => {
    const { result } = renderHook(() => useCanvasPan({ containerRef: ref }));
    const onIdleUp = vi.fn();

    act(() => {
      result.current.startPan(fakeReactMouse(100, 100), onIdleUp);
    });
    act(() => {
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 110, clientY: 120 }));
    });

    expect(result.current.isPanning).toBe(true);
    expect(container.scrollLeft).toBe(40);
    expect(container.scrollTop).toBe(40);

    act(() => {
      document.dispatchEvent(new MouseEvent('mouseup'));
    });

    expect(result.current.isPanning).toBe(false);
    expect(onIdleUp).not.toHaveBeenCalled();
  });

  it('returns false when containerRef.current is null', () => {
    const { result } = renderHook(() => useCanvasPan({ containerRef: { current: null } }));
    const ok = result.current.startPan(fakeReactMouse(0, 0));
    expect(ok).toBe(false);
  });
});
