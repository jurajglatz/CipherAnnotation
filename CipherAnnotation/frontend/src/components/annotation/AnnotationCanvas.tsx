/**
 * AnnotationCanvas Component
 * Main canvas for drawing and managing bounding boxes on manuscript pages.
 * Type-agnostic: every annotation is unified; parent assignment is geometric
 * (deepest container) and stroke colour is driven by the annotation's caption.
 */

import React, { useMemo, useRef } from 'react';
import { Page, Annotation, BoundingBox } from '@/types';
import { buildPreprocessCss, PreprocessOperation } from './PreprocessPanel';
import { AnnotationShape } from './AnnotationShape';
import { DrawingPreview } from './DrawingPreview';
import {
  useCanvasZoom,
  useCanvasPan,
  usePageImageBlob,
  useAnnotationDrawing,
  useBoxResize,
  useBoxMove,
} from '@/hooks';
import { HANDLE_POSITIONS, HANDLE_CURSORS } from '@/hooks/useBoxResize';

type ToolType = 'select' | 'annotation' | 'multiselect';

interface CanvasProps {
  page: Page;
  annotations: Annotation[];
  /** Document captions (sorted by createdAt) — used to predict the colour of a new annotation while drawing. */
  captions?: { id: string; name: string; createdAt: string }[];
  currentTool: ToolType;
  zoom: number;
  selectedAnnotation: Annotation | null;
  selectedIds?: Set<string>;
  /** Create a new annotation from the dragged box. Should resolve to the created Annotation. */
  onCreateFromBox: (box: BoundingBox) => Promise<Annotation | null>;
  onAnnotationSelected: (annotation: Annotation | null, additive?: boolean) => void;
  /** Update the bounding box and (if movement carried it under a different parent) reparent. */
  onDragEndAnnotation: (id: string, newBox: BoundingBox) => Promise<void> | void;
  onMultiBoundingBoxUpdated?: (
    updates: Array<{ id: string; box: BoundingBox }>
  ) => void;
  /** Called when the marquee-select tool commits a rectangle. */
  onMultiSelectFromBox?: (box: BoundingBox) => void;
  showProcessed?: boolean;
  livePreview?: {
    id: string;
    orientation?: number;
    boundingBox?: BoundingBox;
  } | null;
  lockedIds?: Set<string>;
  previewOps?: PreprocessOperation[];
  annotationsDisabled?: boolean;
  /** When true, allows selecting/inspecting annotations but blocks moving, resizing, and drawing. */
  readOnly?: boolean;
}

export const AnnotationCanvas: React.FC<CanvasProps> = ({
  page,
  annotations,
  captions,
  currentTool,
  zoom,
  selectedAnnotation,
  selectedIds,
  onCreateFromBox,
  onAnnotationSelected,
  onDragEndAnnotation,
  onMultiBoundingBoxUpdated,
  onMultiSelectFromBox,
  showProcessed = false,
  livePreview = null,
  lockedIds,
  previewOps,
  annotationsDisabled = false,
  readOnly = false,
}) => {
  const effectiveSelectedIds = selectedIds && selectedIds.size > 0
    ? selectedIds
    : (selectedAnnotation ? new Set([selectedAnnotation.id]) : new Set<string>());
  const isMultiSelect = effectiveSelectedIds.size > 1;
  const isLocked = (id: string) => !!lockedIds && lockedIds.has(id);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { displayWidth, displayHeight } = useCanvasZoom({
    containerRef,
    pageWidth: page.width,
    pageHeight: page.height,
    zoom,
  });
  const { isPanning, modifierHeld, startPan } = useCanvasPan({ containerRef });
  const imageBlobUrl = usePageImageBlob(page, showProcessed);

  const resize = useBoxResize({ pageWidth: page.width, pageHeight: page.height });
  const move = useBoxMove({ pageWidth: page.width, pageHeight: page.height });

  const screenToImageCoords = (screenX: number, screenY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (screenX - rect.left) / (rect.width / page.width),
      y: (screenY - rect.top) / (rect.height / page.height),
    };
  };

  const findAnnotationById = (id: string): Annotation | null =>
    annotations.find((a) => a.id === id) ?? null;

  const drawingHook = useAnnotationDrawing({
    svgRef,
    pageWidth: page.width,
    pageHeight: page.height,
    onCommit: async (box) => {
      if (currentTool === 'multiselect') {
        onMultiSelectFromBox?.(box);
        return;
      }
      const created = await onCreateFromBox(box);
      if (created) onAnnotationSelected(created);
    },
  });

  const finalizeMove = () => {
    const newBox = move.previewRef.current;
    const m = move.movingRef.current;
    if (newBox) {
      const origBox = m.originalBox;
      const dx = newBox.x - origBox.x;
      const dy = newBox.y - origBox.y;
      const extraIds = move.multiOriginsRef.current;
      if (extraIds && extraIds.size > 0 && onMultiBoundingBoxUpdated) {
        const updates: Array<{ id: string; box: BoundingBox }> = [{ id: m.boxId, box: newBox }];
        extraIds.forEach((orig, id) => {
          updates.push({
            id,
            box: {
              ...orig,
              x: Math.max(0, Math.min(orig.x + dx, page.width - orig.width)),
              y: Math.max(0, Math.min(orig.y + dy, page.height - orig.height)),
            },
          });
        });
        onMultiBoundingBoxUpdated(updates);
      } else {
        void onDragEndAnnotation(m.boxId, newBox);
      }
    }
    move.reset();
  };

  const finalizeResize = (curX: number, curY: number) => {
    const r = resize.resizingRef.current;
    const newBox = resize.finalizeBox(curX, curY);
    void onDragEndAnnotation(r.boxId, newBox);
    resize.reset();
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2) return;
    e.preventDefault();

    if ((e.metaKey || e.ctrlKey) && currentTool !== 'select' &&
        !drawingHook.drawingRef.current.isDrawing &&
        !move.movingRef.current.isMoving &&
        !resize.resizingRef.current.isResizing) {
      if (startPan(e)) return;
    }

    const coords = screenToImageCoords(e.clientX, e.clientY);

    if (move.movingRef.current.isMoving) {
      finalizeMove();
      return;
    }

    if (resize.resizingRef.current.isResizing) {
      finalizeResize(coords.x, coords.y);
      return;
    }

    // Resize handle hit-test (single-select only)
    if (!readOnly && selectedAnnotation && currentTool === 'select' &&
        !isLocked(selectedAnnotation.id) && !isMultiSelect) {
      const selected = findAnnotationById(selectedAnnotation.id);
      if (selected) {
        const { x, y, width, height } = selected.boundingBox;
        for (let i = 0; i < HANDLE_POSITIONS.length; i++) {
          const handleX = x + width * HANDLE_POSITIONS[i].x;
          const handleY = y + height * HANDLE_POSITIONS[i].y;
          const distance = Math.hypot(coords.x - handleX, coords.y - handleY);
          if (distance < 15) {
            resize.begin(selectedAnnotation.id, i, { ...selected.boundingBox }, coords.x, coords.y);
            return;
          }
        }
      }
    }

    // Click inside any selected box → start moving (single or group)
    if (!readOnly && currentTool === 'select' && effectiveSelectedIds.size > 0 &&
        !(e.metaKey || e.ctrlKey || e.shiftKey)) {
      for (const id of effectiveSelectedIds) {
        if (isLocked(id)) continue;
        const found = findAnnotationById(id);
        if (!found) continue;
        const { x, y, width, height } = found.boundingBox;
        if (coords.x >= x && coords.x <= x + width && coords.y >= y && coords.y <= y + height) {
          const others = new Map<string, BoundingBox>();
          effectiveSelectedIds.forEach((otherId) => {
            if (otherId === id || isLocked(otherId)) return;
            const o = findAnnotationById(otherId);
            if (o) others.set(otherId, { ...o.boundingBox });
          });
          move.begin(id, { ...found.boundingBox }, coords.x - x, coords.y - y, others);
          return;
        }
      }
    }

    // Selecting an annotation by click (deepest = topmost = smallest area)
    if (currentTool === 'select') {
      const additive = e.metaKey || e.ctrlKey || e.shiftKey;
      const hitCandidates = annotations.filter((a) => {
        const { x, y, width, height } = a.boundingBox;
        return coords.x >= x && coords.x <= x + width && coords.y >= y && coords.y <= y + height;
      });
      if (hitCandidates.length > 0) {
        hitCandidates.sort((a, b) =>
          a.boundingBox.width * a.boundingBox.height - b.boundingBox.width * b.boundingBox.height
        );
        onAnnotationSelected(hitCandidates[0], additive);
        return;
      }
      const started = startPan(e, () => {
        if (!additive) onAnnotationSelected(null);
      });
      if (!started && !additive) onAnnotationSelected(null);
      return;
    }

    // Two-click drawing
    if (!readOnly && currentTool === 'annotation') {
      drawingHook.handleClick(coords.x, coords.y);
      return;
    }

    // Marquee select — same two-click flow, commit selects intersecting annotations.
    if (currentTool === 'multiselect') {
      drawingHook.handleClick(coords.x, coords.y);
      return;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!move.movingRef.current.isMoving && !resize.resizingRef.current.isResizing) return;
    const coords = screenToImageCoords(e.clientX, e.clientY);
    move.updateForCursor(coords.x, coords.y);
    resize.updateForCursor(coords.x, coords.y);
  };

  // Outer→inner render so deepest paint last.
  const sortedForRender = useMemo(
    () => [...annotations].sort(
      (a, b) =>
        (b.boundingBox.width * b.boundingBox.height) -
        (a.boundingBox.width * a.boundingBox.height)
    ),
    [annotations]
  );

  const isSelected = (id: string) => effectiveSelectedIds.has(id);
  const isPrimary = (id: string) => selectedAnnotation?.id === id;

  const previewCss = previewOps && previewOps.length > 0 ? buildPreprocessCss(previewOps) : null;

  const cursor = isPanning
    ? 'grabbing'
    : move.moving.isMoving
      ? 'move'
      : resize.resizing.isResizing
        ? HANDLE_CURSORS[resize.resizing.handleIndex]
        : currentTool === 'select'
          ? 'grab'
          : modifierHeld
            ? 'grab'
            : 'crosshair';

  return (
    <div ref={containerRef} className="w-full h-full bg-gray-100 overflow-auto">
      <div style={{ padding: '16px', width: 'fit-content', margin: '0 auto' }}>
        <div style={{ position: 'relative', width: 'fit-content' }}>
          <img
            src={imageBlobUrl || ''}
            alt="Page"
            style={{
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              display: 'block',
              ...(previewCss
                ? {
                    filter: previewCss.filter || undefined,
                    transform: previewCss.transform || undefined,
                    transformOrigin: 'center center',
                  }
                : {}),
            }}
            className="bg-white shadow-lg"
            draggable={false}
          />

          <svg
            ref={svgRef}
            width={page.width}
            height={page.height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${displayWidth}px`,
              height: `${displayHeight}px`,
              userSelect: 'none',
              display: annotationsDisabled ? 'none' : undefined,
              ...(previewCss
                ? {
                    transform: previewCss.transform || undefined,
                    transformOrigin: 'center center',
                  }
                : {}),
              cursor,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            className="z-10"
            preserveAspectRatio="none"
            viewBox={`0 0 ${page.width} ${page.height}`}
          >
            <rect
              x={0}
              y={0}
              width={page.width}
              height={page.height}
              fill="transparent"
              pointerEvents="all"
            />

            {sortedForRender.map((ann) => {
              const selected = isSelected(ann.id);
              const primary = isPrimary(ann.id);
              const isBeingResized = primary && resize.resizing.isResizing;
              const isBeingMovedPrimary = move.moving.isMoving && move.moving.boxId === ann.id;
              const hasLivePreview = livePreview && livePreview.id === ann.id;

              let groupMoveBox: BoundingBox | null = null;
              if (move.moving.isMoving && move.preview && selected && !isBeingMovedPrimary) {
                const orig = move.multiOriginsRef.current.get(ann.id);
                if (orig) {
                  const dx = move.preview.x - move.moving.originalBox.x;
                  const dy = move.preview.y - move.moving.originalBox.y;
                  groupMoveBox = {
                    ...orig,
                    x: Math.max(0, Math.min(orig.x + dx, page.width - orig.width)),
                    y: Math.max(0, Math.min(orig.y + dy, page.height - orig.height)),
                  };
                }
              }

              const displayBox = isBeingResized && resize.preview
                ? resize.preview
                : isBeingMovedPrimary && move.preview
                  ? move.preview
                  : groupMoveBox
                    ? groupMoveBox
                    : hasLivePreview && livePreview!.boundingBox
                      ? livePreview!.boundingBox!
                      : ann.boundingBox;

              const orientation = hasLivePreview && livePreview!.orientation !== undefined
                ? livePreview!.orientation
                : Number(ann.orientation) || 0;

              const showHandles = primary && !readOnly && currentTool === 'select' &&
                !isMultiSelect && !isLocked(ann.id);

              return (
                <AnnotationShape
                  key={ann.id}
                  annotation={ann}
                  pageWidth={page.width}
                  pageHeight={page.height}
                  displayBox={displayBox}
                  orientation={orientation}
                  selected={selected}
                  primary={primary}
                  showHandles={showHandles}
                  activeHandleIndex={isBeingResized ? resize.resizing.handleIndex : null}
                  dashed={isBeingResized || isBeingMovedPrimary || !!groupMoveBox}
                  onHandleMouseDown={(idx, e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const coords = screenToImageCoords(e.clientX, e.clientY);
                    if (resize.resizingRef.current.isResizing) {
                      finalizeResize(coords.x, coords.y);
                      return;
                    }
                    resize.begin(ann.id, idx, { ...ann.boundingBox }, coords.x, coords.y);
                  }}
                />
              );
            })}

            {currentTool === 'multiselect' && drawingHook.drawing.isDrawing ? (
              <rect
                x={Math.min(drawingHook.drawing.startX, drawingHook.drawing.currentX)}
                y={Math.min(drawingHook.drawing.startY, drawingHook.drawing.currentY)}
                width={Math.abs(drawingHook.drawing.currentX - drawingHook.drawing.startX)}
                height={Math.abs(drawingHook.drawing.currentY - drawingHook.drawing.startY)}
                fill="#1f2937"
                fillOpacity={0.10}
                stroke="#1f2937"
                strokeWidth={1.5}
                strokeDasharray="6,4"
                pointerEvents="none"
              />
            ) : (
              <DrawingPreview
                drawing={drawingHook.drawing}
                annotations={annotations}
                captions={captions}
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default AnnotationCanvas;
