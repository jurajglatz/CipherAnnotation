/**
 * AnnotationCanvas Component
 * Main canvas for drawing and managing bounding boxes on manuscript pages.
 * Type-agnostic: every annotation is unified; parent assignment is geometric
 * (deepest container) and stroke colour is driven by the annotation's caption.
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import { Page, Annotation, BoundingBox } from '@/types';
import { buildPreprocessCss, PreprocessOperation } from './PreprocessPanel';
import { captionColor } from './utils/captionColor';

type ToolType = 'select' | 'annotation';

interface Point {
  x: number;
  y: number;
}

interface DrawingState {
  isDrawing: boolean;
  points: Point[];
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ResizeState {
  isResizing: boolean;
  boxId: string;
  handleIndex: number;
  originalBox: BoundingBox;
  startX: number;
  startY: number;
}

interface MoveState {
  isMoving: boolean;
  boxId: string;
  originalBox: BoundingBox;
  offsetX: number;
  offsetY: number;
}

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
  showProcessed?: boolean;
  livePreview?: {
    id: string;
    orientation?: number;
    boundingBox?: BoundingBox;
  } | null;
  lockedIds?: Set<string>;
  previewOps?: PreprocessOperation[];
  annotationsDisabled?: boolean;
}

const RESIZE_HANDLE_SIZE = 4;
const HANDLE_POSITIONS = [
  { x: 0, y: 0 },
  { x: 0.5, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 0.5 },
  { x: 1, y: 1 },
  { x: 0.5, y: 1 },
  { x: 0, y: 1 },
  { x: 0, y: 0.5 },
];
const HANDLE_CURSORS = [
  'nw-resize', 'n-resize', 'ne-resize', 'e-resize',
  'se-resize', 's-resize', 'sw-resize', 'w-resize',
];

// Geometric containment helpers (used by both create and drag-end).
// Threshold: a candidate counts as a "container" if at least 85% of the inner
// box's area lies inside it. Lets users be slightly sloppy at the boundary
// without accidentally promoting a child to top-level.
const CONTAINMENT_THRESHOLD = 0.85;

function overlapRatio(outer: BoundingBox, inner: BoundingBox): number {
  const ix = Math.max(0, Math.min(outer.x + outer.width,  inner.x + inner.width)  - Math.max(outer.x, inner.x));
  const iy = Math.max(0, Math.min(outer.y + outer.height, inner.y + inner.height) - Math.max(outer.y, inner.y));
  const innerArea = inner.width * inner.height;
  if (innerArea <= 0) return 0;
  return (ix * iy) / innerArea;
}

function findDeepestContainer(all: Annotation[], inner: BoundingBox): Annotation | null {
  const containers = all.filter(a => overlapRatio(a.boundingBox, inner) >= CONTAINMENT_THRESHOLD);
  if (containers.length === 0) return null;
  return containers.reduce((best, cur) =>
    cur.boundingBox.width * cur.boundingBox.height < best.boundingBox.width * best.boundingBox.height ? cur : best,
  );
}

function isDescendantOf(all: Annotation[], candidateId: string, ancestorId: string): boolean {
  const byId = new Map(all.map(a => [a.id, a]));
  let cur: string | null = candidateId;
  while (cur) {
    if (cur === ancestorId) return true;
    cur = byId.get(cur)?.parentId ?? null;
  }
  return false;
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
  showProcessed = false,
  livePreview = null,
  lockedIds,
  previewOps,
  annotationsDisabled = false,
}) => {
  const effectiveSelectedIds = selectedIds && selectedIds.size > 0
    ? selectedIds
    : (selectedAnnotation ? new Set([selectedAnnotation.id]) : new Set<string>());
  const isMultiSelect = effectiveSelectedIds.size > 1;
  const isLocked = (id: string) => !!lockedIds && lockedIds.has(id);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [drawing, setDrawingState] = useState<DrawingState>({
    isDrawing: false,
    points: [],
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });
  const drawingRef = useRef(drawing);
  const drawMoveHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const setDrawing = (val: DrawingState | ((prev: DrawingState) => DrawingState)) => {
    const newVal = typeof val === 'function' ? val(drawingRef.current) : val;
    drawingRef.current = newVal;
    setDrawingState(newVal);
  };

  const [resizing, setResizingState] = useState<ResizeState>({
    isResizing: false,
    boxId: '',
    handleIndex: 0,
    originalBox: { x: 0, y: 0, width: 0, height: 0 },
    startX: 0,
    startY: 0,
  });
  const resizingRef = useRef(resizing);
  const setResizing = (val: ResizeState) => {
    resizingRef.current = val;
    setResizingState(val);
  };

  const [moving, setMovingState] = useState<MoveState>({
    isMoving: false,
    boxId: '',
    originalBox: { x: 0, y: 0, width: 0, height: 0 },
    offsetX: 0,
    offsetY: 0,
  });
  const movingRef = useRef(moving);
  const setMoving = (val: MoveState) => {
    movingRef.current = val;
    setMovingState(val);
  };
  const multiMoveOriginsRef = useRef<Map<string, BoundingBox>>(new Map());

  // Panning state
  const panningRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [modifierHeld, setModifierHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) setModifierHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) setModifierHeld(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => setModifierHeld(false));
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (drawMoveHandlerRef.current) {
        document.removeEventListener('mousemove', drawMoveHandlerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (drawingRef.current.isDrawing) {
        if (drawMoveHandlerRef.current) {
          document.removeEventListener('mousemove', drawMoveHandlerRef.current);
          drawMoveHandlerRef.current = null;
        }
        setDrawing({ isDrawing: false, points: [], startX: 0, startY: 0, currentX: 0, currentY: 0 });
      }
      if (movingRef.current.isMoving) {
        setMoving({ isMoving: false, boxId: '', originalBox: { x: 0, y: 0, width: 0, height: 0 }, offsetX: 0, offsetY: 0 });
        setMovePreview(null);
        multiMoveOriginsRef.current = new Map();
      }
      if (resizingRef.current.isResizing) {
        setResizing({ isResizing: false, boxId: '', handleIndex: 0, originalBox: { x: 0, y: 0, width: 0, height: 0 }, startX: 0, startY: 0 });
        setResizePreview(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fitFactor = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !page.width || !page.height) return 1;
    const padding = 32;
    const wf = (containerSize.width - padding) / page.width;
    const hf = (containerSize.height - padding) / page.height;
    return Math.max(0.001, Math.min(wf, hf));
  }, [containerSize, page.width, page.height]);

  const displayWidth = page.width * (zoom / 100) * fitFactor;
  const displayHeight = page.height * (zoom / 100) * fitFactor;

  const [imageBlobUrl, setImageBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    const imageUrl = showProcessed ? (page.processedImageUrl ?? page.imageUrl) : page.imageUrl;
    if (!imageUrl) return;

    let revoked = false;
    api.get(imageUrl, { responseType: 'blob' }).then((res) => {
      if (!revoked) {
        const url = URL.createObjectURL(res.data);
        setImageBlobUrl(url);
      }
    });

    return () => {
      revoked = true;
      if (imageBlobUrl) URL.revokeObjectURL(imageBlobUrl);
    };
  }, [page.imageUrl, page.processedImageUrl, showProcessed]);

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

  const startPan = (e: React.MouseEvent, onIdleUp?: () => void) => {
    if (!containerRef.current) return false;
    const container = containerRef.current;
    panningRef.current = {
      active: false,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
    const PAN_THRESHOLD = 3;
    const onMove = (me: MouseEvent) => {
      const p = panningRef.current;
      if (!p) return;
      const dx = me.clientX - p.startX;
      const dy = me.clientY - p.startY;
      if (!p.active && Math.hypot(dx, dy) > PAN_THRESHOLD) {
        p.active = true;
        setIsPanning(true);
      }
      if (p.active) {
        container.scrollLeft = p.scrollLeft - dx;
        container.scrollTop = p.scrollTop - dy;
      }
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const wasActive = panningRef.current?.active ?? false;
      panningRef.current = null;
      setIsPanning(false);
      if (wasActive) {
        const swallow = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.preventDefault();
          window.removeEventListener('click', swallow, true);
        };
        window.addEventListener('click', swallow, true);
      } else if (onIdleUp) {
        onIdleUp();
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return true;
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2) return;
    e.preventDefault();

    if ((e.metaKey || e.ctrlKey) && currentTool !== 'select' &&
        !drawingRef.current.isDrawing &&
        !movingRef.current.isMoving &&
        !resizingRef.current.isResizing) {
      if (startPan(e)) return;
    }

    const coords = screenToImageCoords(e.clientX, e.clientY);

    // Finalize an in-progress move
    if (movingRef.current.isMoving) {
      if (movePreviewRef.current) {
        const newBox = movePreviewRef.current;
        const origBox = movingRef.current.originalBox;
        const dx = newBox.x - origBox.x;
        const dy = newBox.y - origBox.y;
        const extraIds = multiMoveOriginsRef.current;
        if (extraIds && extraIds.size > 0 && onMultiBoundingBoxUpdated) {
          const updates: Array<{ id: string; box: BoundingBox }> = [
            { id: movingRef.current.boxId, box: newBox },
          ];
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
          void onDragEndAnnotation(movingRef.current.boxId, newBox);
        }
      }
      setMoving({ isMoving: false, boxId: '', originalBox: { x: 0, y: 0, width: 0, height: 0 }, offsetX: 0, offsetY: 0 });
      setMovePreview(null);
      multiMoveOriginsRef.current = new Map();
      return;
    }

    // Finalize an in-progress resize
    if (resizingRef.current.isResizing) {
      const r = resizingRef.current;
      const { originalBox, handleIndex, startX, startY } = r;
      const deltaX = coords.x - startX;
      const deltaY = coords.y - startY;
      const handlePos = HANDLE_POSITIONS[handleIndex];
      let newBox = { ...originalBox };

      if (handlePos.x === 0) { newBox.x += deltaX; newBox.width -= deltaX; }
      else if (handlePos.x === 1) { newBox.width += deltaX; }
      if (handlePos.y === 0) { newBox.y += deltaY; newBox.height -= deltaY; }
      else if (handlePos.y === 1) { newBox.height += deltaY; }

      newBox.width = Math.max(20, newBox.width);
      newBox.height = Math.max(20, newBox.height);
      newBox.x = Math.max(0, Math.min(newBox.x, page.width - newBox.width));
      newBox.y = Math.max(0, Math.min(newBox.y, page.height - newBox.height));

      void onDragEndAnnotation(r.boxId, newBox);
      setResizing({
        isResizing: false,
        boxId: '',
        handleIndex: 0,
        originalBox: { x: 0, y: 0, width: 0, height: 0 },
        startX: 0,
        startY: 0,
      });
      setResizePreview(null);
      return;
    }

    // Resize handle click (single-select only)
    if (selectedAnnotation && currentTool === 'select' && !isLocked(selectedAnnotation.id) && !isMultiSelect) {
      const selected = findAnnotationById(selectedAnnotation.id);
      if (selected) {
        const { x, y, width, height } = selected.boundingBox;
        for (let i = 0; i < HANDLE_POSITIONS.length; i++) {
          const handleX = x + width * HANDLE_POSITIONS[i].x;
          const handleY = y + height * HANDLE_POSITIONS[i].y;
          const distance = Math.sqrt(
            Math.pow(coords.x - handleX, 2) + Math.pow(coords.y - handleY, 2)
          );
          if (distance < 15) {
            setResizing({
              isResizing: true,
              boxId: selectedAnnotation.id,
              handleIndex: i,
              originalBox: { ...selected.boundingBox },
              startX: coords.x,
              startY: coords.y,
            });
            return;
          }
        }
      }
    }

    // Click inside any selected box → start moving (single or group)
    if (currentTool === 'select' && effectiveSelectedIds.size > 0 && !(e.metaKey || e.ctrlKey || e.shiftKey)) {
      for (const id of effectiveSelectedIds) {
        if (isLocked(id)) continue;
        const found = findAnnotationById(id);
        if (!found) continue;
        const { x, y, width, height } = found.boundingBox;
        if (coords.x >= x && coords.x <= x + width && coords.y >= y && coords.y <= y + height) {
          const origBox = { ...found.boundingBox };
          setMoving({
            isMoving: true,
            boxId: id,
            originalBox: origBox,
            offsetX: coords.x - x,
            offsetY: coords.y - y,
          });
          setMovePreview({ ...origBox });
          const others = new Map<string, BoundingBox>();
          effectiveSelectedIds.forEach((otherId) => {
            if (otherId === id || isLocked(otherId)) return;
            const o = findAnnotationById(otherId);
            if (o) others.set(otherId, { ...o.boundingBox });
          });
          multiMoveOriginsRef.current = others;
          return;
        }
      }
    }

    // Selecting an annotation by click (deepest = topmost in z-order = smallest area)
    if (currentTool === 'select') {
      const additive = e.metaKey || e.ctrlKey || e.shiftKey;
      const hitCandidates = annotations.filter((a) => {
        const { x, y, width, height } = a.boundingBox;
        return coords.x >= x && coords.x <= x + width && coords.y >= y && coords.y <= y + height;
      });
      if (hitCandidates.length > 0) {
        // smallest area first (deepest container under cursor)
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

    // Two-click drawing (single annotation tool)
    if (currentTool === 'annotation') {
      if (!drawingRef.current.isDrawing) {
        setDrawing({
          isDrawing: true,
          points: [],
          startX: coords.x,
          startY: coords.y,
          currentX: coords.x,
          currentY: coords.y,
        });

        const moveHandler = (me: MouseEvent) => {
          const svg = svgRef.current;
          if (!svg) return;
          const r = svg.getBoundingClientRect();
          const cx = (me.clientX - r.left) / (r.width / page.width);
          const cy = (me.clientY - r.top) / (r.height / page.height);
          const ns = { ...drawingRef.current, currentX: cx, currentY: cy };
          drawingRef.current = ns;
          setDrawingState(ns);
        };
        drawMoveHandlerRef.current = moveHandler;
        document.addEventListener('mousemove', moveHandler);
      } else {
        if (drawMoveHandlerRef.current) {
          document.removeEventListener('mousemove', drawMoveHandlerRef.current);
          drawMoveHandlerRef.current = null;
        }

        const d = drawingRef.current;
        const x = Math.min(d.startX, coords.x);
        const y = Math.min(d.startY, coords.y);
        const width = Math.abs(coords.x - d.startX);
        const height = Math.abs(coords.y - d.startY);

        if (width > 5 && height > 5) {
          void createFromBox({ x, y, width, height });
        }

        setDrawing({
          isDrawing: false,
          points: [],
          startX: 0,
          startY: 0,
          currentX: 0,
          currentY: 0,
        });
      }
      return;
    }
  };

  // Single create flow — defaults to type 'Text', server picks captionId by depth.
  async function createFromBox(box: BoundingBox) {
    const created = await onCreateFromBox(box);
    if (created) onAnnotationSelected(created);
  }

  const [resizePreview, setResizePreviewState] = useState<BoundingBox | null>(null);
  const resizePreviewRef = useRef<BoundingBox | null>(null);
  const setResizePreview = (val: BoundingBox | null) => {
    resizePreviewRef.current = val;
    setResizePreviewState(val);
  };

  const [movePreview, setMovePreviewState] = useState<BoundingBox | null>(null);
  const movePreviewRef = useRef<BoundingBox | null>(null);
  const setMovePreview = (val: BoundingBox | null) => {
    movePreviewRef.current = val;
    setMovePreviewState(val);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (movingRef.current.isMoving) {
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const mx = (e.clientX - r.left) / (r.width / page.width);
      const my = (e.clientY - r.top) / (r.height / page.height);
      const origBox = movingRef.current.originalBox;
      const newX = Math.max(0, Math.min(mx - movingRef.current.offsetX, page.width - origBox.width));
      const newY = Math.max(0, Math.min(my - movingRef.current.offsetY, page.height - origBox.height));
      setMovePreview({ ...origBox, x: newX, y: newY });
    }

    if (resizingRef.current.isResizing) {
      const svg = svgRef.current;
      if (!svg) return;
      const r = svg.getBoundingClientRect();
      const cx = (e.clientX - r.left) / (r.width / page.width);
      const cy = (e.clientY - r.top) / (r.height / page.height);
      const rs = resizingRef.current;
      const deltaX = cx - rs.startX;
      const deltaY = cy - rs.startY;
      const hp = HANDLE_POSITIONS[rs.handleIndex];
      let nb = { ...rs.originalBox };
      if (hp.x === 0) { nb.x += deltaX; nb.width -= deltaX; }
      else if (hp.x === 1) { nb.width += deltaX; }
      if (hp.y === 0) { nb.y += deltaY; nb.height -= deltaY; }
      else if (hp.y === 1) { nb.height += deltaY; }
      nb.width = Math.max(20, nb.width);
      nb.height = Math.max(20, nb.height);
      nb.x = Math.max(0, Math.min(nb.x, page.width - nb.width));
      nb.y = Math.max(0, Math.min(nb.y, page.height - nb.height));
      setResizePreview(nb);
    }
  };

  const handleMouseUp = (_e: React.MouseEvent<SVGSVGElement>) => {
    // Resize/move finalize on click, not on mouseup.
  };

  // Render annotations: outer→inner so deepest paint last.
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-gray-100 overflow-auto"
    >
      <div style={{ padding: '16px', width: 'fit-content', margin: '0 auto' }}>
        <div style={{
          position: 'relative',
          width: 'fit-content',
        }}>
          <img
          src={imageBlobUrl || ''}
          alt="Page"
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            maxWidth: 'none',
            maxHeight: 'none',
            display: 'block',
            ...(previewOps && previewOps.length > 0
              ? (() => {
                  const { filter, transform } = buildPreprocessCss(previewOps);
                  return {
                    filter: filter || undefined,
                    transform: transform || undefined,
                    transformOrigin: 'center center',
                  };
                })()
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
            ...(previewOps && previewOps.length > 0
              ? (() => {
                  const { transform } = buildPreprocessCss(previewOps);
                  return {
                    transform: transform || undefined,
                    transformOrigin: 'center center',
                  };
                })()
              : {}),
            cursor:
              isPanning
                ? 'grabbing'
                : moving.isMoving
                  ? 'move'
                  : resizing.isResizing
                    ? HANDLE_CURSORS[resizing.handleIndex]
                    : currentTool === 'select'
                      ? 'grab'
                      : modifierHeld
                        ? 'grab'
                        : 'crosshair',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}

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
            const isBeingResized = primary && resizing.isResizing;
            const isBeingMovedPrimary = moving.isMoving && moving.boxId === ann.id;
            const hasLivePreview = livePreview && livePreview.id === ann.id;
            let groupMoveBox: BoundingBox | null = null;
            if (moving.isMoving && movePreview && selected && !isBeingMovedPrimary) {
              const orig = multiMoveOriginsRef.current.get(ann.id);
              if (orig) {
                const dx = movePreview.x - moving.originalBox.x;
                const dy = movePreview.y - moving.originalBox.y;
                groupMoveBox = {
                  ...orig,
                  x: Math.max(0, Math.min(orig.x + dx, page.width - orig.width)),
                  y: Math.max(0, Math.min(orig.y + dy, page.height - orig.height)),
                };
              }
            }
            const displayBox = isBeingResized && resizePreview
              ? resizePreview
              : isBeingMovedPrimary && movePreview
                ? movePreview
                : groupMoveBox
                  ? groupMoveBox
                  : hasLivePreview && livePreview!.boundingBox
                    ? livePreview!.boundingBox!
                    : ann.boundingBox;
            const { x, y, width, height } = displayBox;
            const color = captionColor(ann.captionName);
            const orientation = hasLivePreview && livePreview!.orientation !== undefined
              ? livePreview!.orientation
              : Number(ann.orientation) || 0;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const groupTransform = orientation ? `rotate(${orientation} ${cx} ${cy})` : undefined;

            return (
              <g key={ann.id} transform={groupTransform}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={color}
                  fillOpacity={selected ? 0.33 : 0.06}
                  stroke={color}
                  strokeWidth={selected ? 5 : 4}
                  strokeDasharray={isBeingResized || isBeingMovedPrimary || groupMoveBox ? '4,4' : ''}
                  pointerEvents="none"
                />

                {primary && currentTool === 'select' && !isMultiSelect && !isLocked(ann.id) && (
                  <>
                    {HANDLE_POSITIONS.map((pos, idx) => {
                      const isActiveHandle = isBeingResized && resizing.handleIndex === idx;
                      const origBox = ann.boundingBox;
                      return (
                        <rect
                          key={`handle-${idx}`}
                          x={x + width * pos.x - (RESIZE_HANDLE_SIZE / 2) * (page.width / 512)}
                          y={y + height * pos.y - (RESIZE_HANDLE_SIZE / 2) * (page.height / 512)}
                          width={RESIZE_HANDLE_SIZE * (page.width / 512)}
                          height={RESIZE_HANDLE_SIZE * (page.height / 512)}
                          rx={1.5 * (page.width / 512)}
                          ry={1.5 * (page.height / 512)}
                          fill={isActiveHandle ? color : 'white'}
                          stroke={color}
                          strokeWidth={1.25}
                          shapeRendering="geometricPrecision"
                          style={{ cursor: HANDLE_CURSORS[idx] }}
                          pointerEvents="auto"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();

                            const coords = screenToImageCoords(e.clientX, e.clientY);

                            if (resizingRef.current.isResizing) {
                              const r = resizingRef.current;
                              const deltaX = coords.x - r.startX;
                              const deltaY = coords.y - r.startY;
                              const hp = HANDLE_POSITIONS[r.handleIndex];
                              let nb = { ...r.originalBox };
                              if (hp.x === 0) { nb.x += deltaX; nb.width -= deltaX; }
                              else if (hp.x === 1) { nb.width += deltaX; }
                              if (hp.y === 0) { nb.y += deltaY; nb.height -= deltaY; }
                              else if (hp.y === 1) { nb.height += deltaY; }
                              nb.width = Math.max(20, nb.width);
                              nb.height = Math.max(20, nb.height);
                              nb.x = Math.max(0, Math.min(nb.x, page.width - nb.width));
                              nb.y = Math.max(0, Math.min(nb.y, page.height - nb.height));
                              void onDragEndAnnotation(r.boxId, nb);
                              setResizing({ isResizing: false, boxId: '', handleIndex: 0, originalBox: { x: 0, y: 0, width: 0, height: 0 }, startX: 0, startY: 0 });
                              setResizePreview(null);
                              return;
                            }

                            setResizing({
                              isResizing: true,
                              boxId: ann.id,
                              handleIndex: idx,
                              originalBox: { ...origBox },
                              startX: coords.x,
                              startY: coords.y,
                            });
                          }}
                        />
                      );
                    })}
                  </>
                )}

                {/* Caption label — small translucent pill above box, falls inside if no room */}
                {(() => {
                  const labelText = `${ann.captionName} ${ann.captionNumber}`;
                  const fontSize = 5 * (page.width / 512);
                  const padX = 2 * (page.width / 512);
                  const padY = 1 * (page.width / 512);
                  const charW = fontSize * 0.6;
                  const labelW = labelText.length * charW + padX * 2;
                  const labelH = fontSize + padY * 2;
                  const aboveY = y - labelH - 2 * (page.height / 512);
                  const placeAbove = aboveY > 0;
                  const lx = x;
                  const ly = placeAbove ? aboveY : y + 2 * (page.height / 512);
                  return (
                    <g pointerEvents="none" opacity={0.7}>
                      <rect
                        x={lx}
                        y={ly}
                        width={labelW}
                        height={labelH}
                        rx={2 * (page.width / 512)}
                        ry={2 * (page.width / 512)}
                        fill={color}
                        fillOpacity={0.6}
                      />
                      <text
                        x={lx + padX}
                        y={ly + padY + fontSize * 0.85}
                        fontSize={fontSize}
                        fill="white"
                        fontWeight={600}
                      >
                        {labelText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* Drawing preview */}
          {drawing.isDrawing && (() => {
            // Predict the colour of the new annotation using the same depth->caption
            // mapping the server uses (PickDefaultCaption: depth 0/1/2/≥3 -> caption #1/#2/#3/#4 by createdAt).
            const previewBox = {
              x: Math.min(drawing.startX, drawing.currentX),
              y: Math.min(drawing.startY, drawing.currentY),
              width: Math.abs(drawing.currentX - drawing.startX),
              height: Math.abs(drawing.currentY - drawing.startY),
            };
            const parent = findDeepestContainer(annotations, previewBox);
            let depth = 0;
            let cur: string | null = parent?.id ?? null;
            const byId = new Map(annotations.map(a => [a.id, a]));
            while (cur) {
              depth++;
              cur = byId.get(cur)?.parentId ?? null;
              if (depth > 64) break;
            }
            const orderedCaptions = (captions ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
            const previewCaption = orderedCaptions[depth];
            const color = previewCaption
              ? captionColor(previewCaption.name)
              : captionColor(`Annotation lvl ${depth + 1}`);
            return (
              <rect
                x={Math.min(drawing.startX, drawing.currentX)}
                y={Math.min(drawing.startY, drawing.currentY)}
                width={Math.abs(drawing.currentX - drawing.startX)}
                height={Math.abs(drawing.currentY - drawing.startY)}
                fill={color}
                fillOpacity={0.13}
                stroke={color}
                strokeWidth={2}
                strokeDasharray="4,4"
                pointerEvents="none"
              />
            );
          })()}
        </svg>
        </div>
      </div>
    </div>
  );
};

export { findDeepestContainer, isDescendantOf };
export default AnnotationCanvas;
