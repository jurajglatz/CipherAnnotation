import { useEffect, useRef, useState } from 'react';
import { BoundingBox } from '@/types';

export const HANDLE_POSITIONS = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 0.5 },
  { x: 1, y: 1 },
  { x: 0.5, y: 1 },
  { x: 0, y: 1 },
  { x: 0, y: 0.5 },
];

export const HANDLE_CURSORS = [
  'nw-resize', 'n-resize', 'ne-resize', 'e-resize',
  'se-resize', 's-resize', 'sw-resize', 'w-resize',
];

export const RESIZE_HANDLE_SIZE = 4;

export interface ResizeState {
  isResizing: boolean;
  boxId: string;
  handleIndex: number;
  originalBox: BoundingBox;
  startX: number;
  startY: number;
}

const INITIAL: ResizeState = {
  isResizing: false,
  boxId: '',
  handleIndex: 0,
  originalBox: { x: 0, y: 0, width: 0, height: 0 },
  startX: 0,
  startY: 0,
};

interface Args {
  pageWidth: number;
  pageHeight: number;
}

export function computeResizedBox(
  state: ResizeState,
  curX: number,
  curY: number,
  pageWidth: number,
  pageHeight: number,
): BoundingBox {
  const deltaX = curX - state.startX;
  const deltaY = curY - state.startY;
  const hp = HANDLE_POSITIONS[state.handleIndex];
  let nb = { ...state.originalBox };
  if (hp.x === 0) { nb.x += deltaX; nb.width -= deltaX; }
  else if (hp.x === 1) { nb.width += deltaX; }
  if (hp.y === 0) { nb.y += deltaY; nb.height -= deltaY; }
  else if (hp.y === 1) { nb.height += deltaY; }
  nb.width = Math.max(20, nb.width);
  nb.height = Math.max(20, nb.height);
  nb.x = Math.max(0, Math.min(nb.x, pageWidth - nb.width));
  nb.y = Math.max(0, Math.min(nb.y, pageHeight - nb.height));
  return nb;
}

export function useBoxResize({ pageWidth, pageHeight }: Args) {
  const [resizing, setResizingState] = useState<ResizeState>(INITIAL);
  const resizingRef = useRef(resizing);
  const setResizing = (val: ResizeState) => {
    resizingRef.current = val;
    setResizingState(val);
  };

  const [preview, setPreviewState] = useState<BoundingBox | null>(null);
  const previewRef = useRef<BoundingBox | null>(null);
  const setPreview = (val: BoundingBox | null) => {
    previewRef.current = val;
    setPreviewState(val);
  };

  const reset = () => {
    setResizing(INITIAL);
    setPreview(null);
  };

  // Escape cancels an in-progress resize.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (resizingRef.current.isResizing) reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const begin = (
    boxId: string,
    handleIndex: number,
    originalBox: BoundingBox,
    startX: number,
    startY: number,
  ) => {
    setResizing({ isResizing: true, boxId, handleIndex, originalBox, startX, startY });
  };

  const updateForCursor = (curX: number, curY: number) => {
    if (!resizingRef.current.isResizing) return;
    setPreview(computeResizedBox(resizingRef.current, curX, curY, pageWidth, pageHeight));
  };

  const finalizeBox = (curX: number, curY: number): BoundingBox =>
    computeResizedBox(resizingRef.current, curX, curY, pageWidth, pageHeight);

  return { resizing, resizingRef, preview, previewRef, begin, updateForCursor, finalizeBox, reset };
}
