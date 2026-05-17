import { RefObject, useEffect, useRef, useState } from 'react';
import { BoundingBox } from '@/types';

export interface DrawingState {
  isDrawing: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const INITIAL: DrawingState = {
  isDrawing: false,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
};

interface Args {
  svgRef: RefObject<SVGSVGElement>;
  pageWidth: number;
  pageHeight: number;
  onCommit: (box: BoundingBox) => void;
}

export function useAnnotationDrawing({ svgRef, pageWidth, pageHeight, onCommit }: Args) {
  const [drawing, setDrawingState] = useState<DrawingState>(INITIAL);
  const drawingRef = useRef(drawing);
  const moveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);

  const setDrawing = (val: DrawingState | ((prev: DrawingState) => DrawingState)) => {
    const next = typeof val === 'function' ? (val as (p: DrawingState) => DrawingState)(drawingRef.current) : val;
    drawingRef.current = next;
    setDrawingState(next);
  };

  const cancelMoveListener = () => {
    if (moveHandlerRef.current) {
      document.removeEventListener('mousemove', moveHandlerRef.current);
      moveHandlerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => cancelMoveListener();
  }, []);

  // Escape cancels in-progress draw
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (drawingRef.current.isDrawing) {
        cancelMoveListener();
        setDrawing(INITIAL);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Two-click flow: first click starts; second click commits.
  const handleClick = (imageX: number, imageY: number) => {
    if (!drawingRef.current.isDrawing) {
      setDrawing({
        isDrawing: true,
        startX: imageX,
        startY: imageY,
        currentX: imageX,
        currentY: imageY,
      });
      const moveHandler = (me: MouseEvent) => {
        const svg = svgRef.current;
        if (!svg) return;
        const r = svg.getBoundingClientRect();
        const cx = (me.clientX - r.left) / (r.width / pageWidth);
        const cy = (me.clientY - r.top) / (r.height / pageHeight);
        const next = { ...drawingRef.current, currentX: cx, currentY: cy };
        drawingRef.current = next;
        setDrawingState(next);
      };
      moveHandlerRef.current = moveHandler;
      document.addEventListener('mousemove', moveHandler);
    } else {
      cancelMoveListener();
      const d = drawingRef.current;
      const x = Math.min(d.startX, imageX);
      const y = Math.min(d.startY, imageY);
      const width = Math.abs(imageX - d.startX);
      const height = Math.abs(imageY - d.startY);
      if (width > 5 && height > 5) onCommit({ x, y, width, height });
      setDrawing(INITIAL);
    }
  };

  return { drawing, drawingRef, handleClick };
}
