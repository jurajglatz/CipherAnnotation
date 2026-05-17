import { useEffect } from 'react';

interface Args {
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onEscape: () => void;
  readOnly: boolean;
}

export function useAnnotationKeyboardShortcuts({
  onDelete,
  onUndo,
  onRedo,
  onEscape,
  readOnly,
}: Args) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (readOnly) return;
        e.preventDefault();
        onDelete();
        return;
      }

      if (e.key === 'Escape') {
        onEscape();
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        onRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onDelete, onUndo, onRedo, onEscape, readOnly]);
}
