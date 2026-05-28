import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnnotationKeyboardShortcuts } from './useAnnotationKeyboardShortcuts';

function callbacks() {
  return {
    onDelete: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onEscape: vi.fn(),
    onDuplicate: vi.fn(),
  };
}

function fire(opts: KeyboardEventInit & { tag?: string } = {}) {
  const { tag, ...rest } = opts;
  const evt = new KeyboardEvent('keydown', { bubbles: true, ...rest });
  if (tag) {
    const target = document.createElement(tag);
    document.body.appendChild(target);
    Object.defineProperty(evt, 'target', { value: target });
  }
  window.dispatchEvent(evt);
}

describe('useAnnotationKeyboardShortcuts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Delete key triggers onDelete when not readOnly', () => {
    const cb = callbacks();
    renderHook(() => useAnnotationKeyboardShortcuts({ ...cb, readOnly: false }));
    fire({ key: 'Delete' });
    expect(cb.onDelete).toHaveBeenCalledTimes(1);
  });

  it('Backspace key triggers onDelete when not readOnly', () => {
    const cb = callbacks();
    renderHook(() => useAnnotationKeyboardShortcuts({ ...cb, readOnly: false }));
    fire({ key: 'Backspace' });
    expect(cb.onDelete).toHaveBeenCalledTimes(1);
  });

  it('Delete does NOT trigger onDelete when readOnly', () => {
    const cb = callbacks();
    renderHook(() => useAnnotationKeyboardShortcuts({ ...cb, readOnly: true }));
    fire({ key: 'Delete' });
    expect(cb.onDelete).not.toHaveBeenCalled();
  });

  it('Escape triggers onEscape regardless of readOnly', () => {
    const cb = callbacks();
    renderHook(() => useAnnotationKeyboardShortcuts({ ...cb, readOnly: true }));
    fire({ key: 'Escape' });
    expect(cb.onEscape).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Z triggers onUndo; Ctrl+Y and Ctrl+Shift+Z trigger onRedo', () => {
    const cb = callbacks();
    renderHook(() => useAnnotationKeyboardShortcuts({ ...cb, readOnly: false }));
    fire({ key: 'z', ctrlKey: true });
    fire({ key: 'y', ctrlKey: true });
    fire({ key: 'z', ctrlKey: true, shiftKey: true });
    expect(cb.onUndo).toHaveBeenCalledTimes(1);
    expect(cb.onRedo).toHaveBeenCalledTimes(2);
  });

  it('Ctrl+D triggers onDuplicate when not readOnly, ignored when readOnly', () => {
    const cb = callbacks();
    const { rerender } = renderHook(
      ({ ro }: { ro: boolean }) =>
        useAnnotationKeyboardShortcuts({ ...cb, readOnly: ro }),
      { initialProps: { ro: false } },
    );
    fire({ key: 'd', ctrlKey: true });
    expect(cb.onDuplicate).toHaveBeenCalledTimes(1);

    rerender({ ro: true });
    fire({ key: 'd', ctrlKey: true });
    expect(cb.onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('shortcuts are ignored when an INPUT/TEXTAREA/SELECT is focused', () => {
    const cb = callbacks();
    renderHook(() => useAnnotationKeyboardShortcuts({ ...cb, readOnly: false }));

    fire({ key: 'Delete', tag: 'input' });
    fire({ key: 'z', ctrlKey: true, tag: 'textarea' });

    expect(cb.onDelete).not.toHaveBeenCalled();
    expect(cb.onUndo).not.toHaveBeenCalled();
  });
});
