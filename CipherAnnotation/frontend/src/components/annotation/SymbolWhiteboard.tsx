/**
 * SymbolWhiteboard
 * Freehand canvas for redrawing a cipher symbol. Tracks pointer strokes in
 * component state so Undo/Clear work on whole strokes. On Save, exports the
 * current canvas content as a PNG Blob and hands it to the parent.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, Save, Undo2, X } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}
type Stroke = Point[];

interface SymbolWhiteboardProps {
  size?: number;
  onSave: (png: Blob) => void | Promise<void>;
  onCancel?: () => void;
  busy?: boolean;
}

const DEFAULT_SIZE = 256;
const STROKE_WIDTH = 4;

export const SymbolWhiteboard: React.FC<SymbolWhiteboardProps> = ({
  size = DEFAULT_SIZE,
  onSave,
  onCancel,
  busy = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const drawingRef = useRef(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const all = current ? [...strokes, current] : strokes;
    for (const stroke of all) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  }, [strokes, current]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (busy) return;
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    setCurrent([pointFromEvent(e)]);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    setCurrent((c) => (c ? [...c, pointFromEvent(e)] : c));
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    canvasRef.current?.releasePointerCapture(e.pointerId);
    setCurrent((c) => {
      if (c && c.length > 0) setStrokes((s) => [...s, c]);
      return null;
    });
  }

  function clearAll() {
    setStrokes([]);
    setCurrent(null);
  }

  function undo() {
    setStrokes((s) => s.slice(0, -1));
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (strokes.length === 0) return;
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png'),
    );
    if (blob) await onSave(blob);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="bg-white border border-sepia-600/30 rounded-md shadow-sm self-start"
        style={{ width: size, height: size }}
      >
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="touch-none cursor-crosshair w-full h-full block rounded-md"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={undo}
          disabled={busy || strokes.length === 0}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-sepia-600/30 rounded hover:bg-parchment-50 disabled:opacity-40"
        >
          <Undo2 className="w-3 h-3" /> Undo
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={busy || (strokes.length === 0 && !current)}
          className="flex items-center gap-1 px-2 py-1 text-sm border border-sepia-600/30 rounded hover:bg-parchment-50 disabled:opacity-40"
        >
          <Eraser className="w-3 h-3" /> Clear
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex items-center gap-1 px-2 py-1 text-sm border border-sepia-600/30 rounded hover:bg-parchment-50 disabled:opacity-40"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={busy || strokes.length === 0}
          className="flex items-center gap-1 px-3 py-1 text-sm bg-ink-900 text-parchment-50 rounded hover:bg-ink-900/90 disabled:opacity-40"
        >
          <Save className="w-3 h-3" /> Save
        </button>
      </div>
    </div>
  );
};

export default SymbolWhiteboard;
