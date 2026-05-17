import { useEffect, useRef, useState } from 'react';
import { BoundingBox } from '@/types';

export interface MoveState {
  isMoving: boolean;
  boxId: string;
  originalBox: BoundingBox;
  offsetX: number;
  offsetY: number;
}

const INITIAL: MoveState = {
  isMoving: false,
  boxId: '',
  originalBox: { x: 0, y: 0, width: 0, height: 0 },
  offsetX: 0,
  offsetY: 0,
};

interface Args {
  pageWidth: number;
  pageHeight: number;
}

export function useBoxMove({ pageWidth, pageHeight }: Args) {
  const [moving, setMovingState] = useState<MoveState>(INITIAL);
  const movingRef = useRef(moving);
  const setMoving = (val: MoveState) => {
    movingRef.current = val;
    setMovingState(val);
  };

  const [preview, setPreviewState] = useState<BoundingBox | null>(null);
  const previewRef = useRef<BoundingBox | null>(null);
  const setPreview = (val: BoundingBox | null) => {
    previewRef.current = val;
    setPreviewState(val);
  };

  // Origins of additional items in a multi-select move, keyed by id.
  const multiOriginsRef = useRef<Map<string, BoundingBox>>(new Map());

  const reset = () => {
    setMoving(INITIAL);
    setPreview(null);
    multiOriginsRef.current = new Map();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (movingRef.current.isMoving) reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const begin = (
    boxId: string,
    originalBox: BoundingBox,
    offsetX: number,
    offsetY: number,
    additionalOrigins: Map<string, BoundingBox>,
  ) => {
    setMoving({ isMoving: true, boxId, originalBox, offsetX, offsetY });
    setPreview({ ...originalBox });
    multiOriginsRef.current = additionalOrigins;
  };

  const updateForCursor = (cursorX: number, cursorY: number) => {
    if (!movingRef.current.isMoving) return;
    const orig = movingRef.current.originalBox;
    const newX = Math.max(0, Math.min(cursorX - movingRef.current.offsetX, pageWidth - orig.width));
    const newY = Math.max(0, Math.min(cursorY - movingRef.current.offsetY, pageHeight - orig.height));
    setPreview({ ...orig, x: newX, y: newY });
  };

  return { moving, movingRef, preview, previewRef, multiOriginsRef, begin, updateForCursor, reset };
}
