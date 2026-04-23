/**
 * CreateSymbolDialog Component
 * Creates a symbol from:
 *  - an auto-cropped region of the page image (based on element bounding box)
 *  - a hand-drawn sketch the user produces with the mouse on a canvas
 * Both are combined into a single PNG and uploaded to the backend.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Eraser } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/shared';
import { symbolService, api } from '@/services';
import { BoundingBox, Symbol } from '@/types';

interface CreateSymbolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (symbol: Symbol) => void;
  pageImageUrl?: string;
  boundingBox?: BoundingBox;
  pageWidth?: number;
  pageHeight?: number;
  initialCode?: string;
}

const DRAW_CANVAS_SIZE = 240;

export const CreateSymbolDialog: React.FC<CreateSymbolDialogProps> = ({
  isOpen,
  onClose,
  onCreated,
  pageImageUrl,
  boundingBox,
  pageWidth,
  pageHeight,
  initialCode = '',
}) => {
  const [code, setCode] = useState(initialCode);
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Crop the bounding box region out of the page image whenever the dialog opens.
  useEffect(() => {
    if (!isOpen || !pageImageUrl || !boundingBox) {
      setCroppedDataUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const cropFromImg = (img: HTMLImageElement) => {
      // Bounding box coords are in page.width/page.height space; scale to
      // the image's natural pixel dimensions.
      const scaleX = pageWidth ? img.naturalWidth / pageWidth : 1;
      const scaleY = pageHeight ? img.naturalHeight / pageHeight : 1;

      const sx = boundingBox.x * scaleX;
      const sy = boundingBox.y * scaleY;
      const sw = boundingBox.width * scaleX;
      const sh = boundingBox.height * scaleY;

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      setCroppedDataUrl(canvas.toDataURL('image/png'));
    };

    const loadViaBlob = async () => {
      try {
        // Strip absolute origin if present; axios baseURL handles the rest.
        const url = pageImageUrl.replace(/^https?:\/\/[^/]+/, '');
        const response = await api.get(url, { responseType: 'blob' });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response.data as Blob);
        const img = new Image();
        img.onload = () => {
          if (cancelled) return;
          try {
            cropFromImg(img);
          } catch (err) {
            toast.error('Failed to crop image');
          }
        };
        img.onerror = () => {
          if (!cancelled) toast.error('Failed to decode page image');
        };
        img.src = objectUrl;
      } catch (err) {
        if (!cancelled) toast.error('Failed to load page image');
      }
    };

    loadViaBlob();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, pageImageUrl, boundingBox]);

  // Initialize drawing canvas (white background) when dialog opens.
  useEffect(() => {
    if (!isOpen) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [isOpen]);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    lastPointRef.current = getCanvasPoint(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !lastPointRef.current) return;
    const p = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastPointRef.current = p;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClearDrawing = () => {
    const canvas = drawCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const reset = () => {
    setCode('');
    setCroppedDataUrl(null);
    handleClearDrawing();
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  // Combine cropped region + drawing side-by-side into a single PNG blob.
  const buildCombinedBlob = async (): Promise<Blob | null> => {
    const drawCanvas = drawCanvasRef.current;
    if (!drawCanvas) return null;

    const targetHeight = DRAW_CANVAS_SIZE;

    const loadImg = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });

    let cropImg: HTMLImageElement | null = null;
    if (croppedDataUrl) {
      try {
        cropImg = await loadImg(croppedDataUrl);
      } catch {
        cropImg = null;
      }
    }

    const cropScaledWidth = cropImg
      ? Math.round((cropImg.width / cropImg.height) * targetHeight)
      : 0;
    const combined = document.createElement('canvas');
    combined.width = cropScaledWidth + drawCanvas.width + (cropImg ? 8 : 0);
    combined.height = targetHeight;
    const ctx = combined.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, combined.width, combined.height);
    if (cropImg) {
      ctx.drawImage(cropImg, 0, 0, cropScaledWidth, targetHeight);
    }
    ctx.drawImage(
      drawCanvas,
      cropScaledWidth + (cropImg ? 8 : 0),
      0,
      drawCanvas.width,
      drawCanvas.height
    );

    return new Promise((resolve) =>
      combined.toBlob((b) => resolve(b), 'image/png')
    );
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.error('Code is required');
      return;
    }
    try {
      setIsSubmitting(true);
      const blob = await buildCombinedBlob();
      if (!blob) {
        toast.error('Failed to build image');
        return;
      }
      const formData = new FormData();
      formData.append('code', code.trim());
      formData.append('file', blob, `${code.trim()}.png`);
      const symbol = await symbolService.createSymbol(formData);
      toast.success('Symbol created');
      onCreated(symbol);
      reset();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create symbol';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Symbol" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. sym_01"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Cropped region from page */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Cropped region
            </p>
            <div
              className="border border-gray-300 rounded-md bg-gray-50 flex items-center justify-center overflow-hidden"
              style={{ height: DRAW_CANVAS_SIZE }}
            >
              {croppedDataUrl ? (
                <img
                  src={croppedDataUrl}
                  alt="cropped region"
                  className="w-full h-full object-contain"
                />
              ) : (
                <p className="text-xs text-gray-500 text-center px-2">
                  {boundingBox && pageImageUrl
                    ? 'Loading...'
                    : 'No bounding box available'}
                </p>
              )}
            </div>
          </div>

          {/* Drawing canvas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">Draw symbol</p>
              <button
                type="button"
                onClick={handleClearDrawing}
                disabled={isSubmitting}
                className="flex items-center gap-1 text-xs text-gray-600 hover:text-red-600"
              >
                <Eraser className="w-3 h-3" />
                Clear
              </button>
            </div>
            <canvas
              ref={drawCanvasRef}
              width={DRAW_CANVAS_SIZE}
              height={DRAW_CANVAS_SIZE}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="border border-gray-300 rounded-md bg-white cursor-crosshair w-full"
              style={{ height: DRAW_CANVAS_SIZE, touchAction: 'none' }}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateSymbolDialog;
