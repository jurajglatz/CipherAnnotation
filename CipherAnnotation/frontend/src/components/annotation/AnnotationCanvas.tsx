/**
 * AnnotationCanvas Component
 * Main canvas for drawing and managing bounding boxes on manuscript pages
 * Handles SVG overlay with drawing, selection, and resizing logic
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import api from '@/services/api';
import {
  Page,
  SectionAnnotation,
  PairAnnotation,
  ElementAnnotation,
  BoundingBox,
} from '@/types';
import { buildPreprocessCss, PreprocessOperation } from './PreprocessPanel';

type ToolType = 'select' | 'section' | 'pair' | 'element';

interface SelectedAnnotation {
  id: string;
  type: 'section' | 'pair' | 'element';
  data: any;
}

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
  annotations: SectionAnnotation[];
  currentTool: ToolType;
  zoom: number;
  selectedAnnotation: SelectedAnnotation | null;
  selectedIds?: Set<string>;
  onAnnotationCreated: (boundingBox: BoundingBox) => void;
  onAnnotationSelected: (annotation: SelectedAnnotation | null, additive?: boolean) => void;
  onBoundingBoxUpdated: (
    pageId: string,
    boxId: string,
    box: BoundingBox
  ) => void;
  onMultiBoundingBoxUpdated?: (
    pageId: string,
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

const RESIZE_HANDLE_SIZE = 5;
const HANDLE_POSITIONS = [
  { x: 0, y: 0 }, // top-left
  { x: 0.5, y: 0 }, // top-center
  { x: 1, y: 0 }, // top-right
  { x: 1, y: 0.5 }, // right-center
  { x: 1, y: 1 }, // bottom-right
  { x: 0.5, y: 1 }, // bottom-center
  { x: 0, y: 1 }, // bottom-left
  { x: 0, y: 0.5 }, // left-center
];
const HANDLE_CURSORS = [
  'nw-resize', 'n-resize', 'ne-resize', 'e-resize',
  'se-resize', 's-resize', 'sw-resize', 'w-resize',
];

export const AnnotationCanvas: React.FC<CanvasProps> = ({
  page,
  annotations,
  currentTool,
  zoom,
  selectedAnnotation,
  selectedIds,
  onAnnotationCreated,
  onAnnotationSelected,
  onBoundingBoxUpdated,
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

  // State - use ref as source of truth for drawing to avoid stale closures
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
  // Map of other selected ids -> their original boxes during a group move
  const multiMoveOriginsRef = useRef<Map<string, BoundingBox>>(new Map());

  // Panning state (cmd/ctrl + drag scrolls the container)
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

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      if (drawMoveHandlerRef.current) {
        document.removeEventListener('mousemove', drawMoveHandlerRef.current);
      }
    };
  }, []);

  // Escape cancels any in-progress drawing/move/resize (selection is cleared at the page level)
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

  // Track container size so 100% zoom can mean "fit the available area"
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

  // Scale factor that makes the page fit exactly inside the canvas at zoom = 100%.
  // Padding around the page (16px each side) is subtracted so the page never
  // touches the canvas edges.
  const fitFactor = useMemo(() => {
    if (!containerSize.width || !containerSize.height || !page.width || !page.height) return 1;
    const padding = 32;
    const wf = (containerSize.width - padding) / page.width;
    const hf = (containerSize.height - padding) / page.height;
    return Math.max(0.001, Math.min(wf, hf));
  }, [containerSize, page.width, page.height]);

  const displayWidth = page.width * (zoom / 100) * fitFactor;
  const displayHeight = page.height * (zoom / 100) * fitFactor;

  // Load image via authenticated request
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

  // Convert screen coordinates to SVG/image coordinates
  const screenToImageCoords = (screenX: number, screenY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };

    const rect = svg.getBoundingClientRect();
    return {
      x: (screenX - rect.left) / (rect.width / page.width),
      y: (screenY - rect.top) / (rect.height / page.height),
    };
  };

  // Find annotation by ID
  const findAnnotationById = (
    id: string
  ): { type: 'section' | 'pair' | 'element'; data: any } | null => {
    for (const section of annotations) {
      if (section.id === id) {
        return { type: 'section', data: section };
      }
      for (const pair of section.pairAnnotations || []) {
        if (pair.id === id) {
          return { type: 'pair', data: pair };
        }
        for (const element of pair.elementAnnotations || []) {
          if (element.id === id) {
            return { type: 'element', data: element };
          }
        }
      }
    }
    return null;
  };

  // Get all boxes for rendering
  const getAllBoxes = () => {
    const boxes: Array<{
      id: string;
      type: 'section' | 'pair' | 'element';
      box: BoundingBox;
      data: any;
    }> = [];

    for (const section of annotations) {
      boxes.push({
        id: section.id,
        type: 'section',
        box: section.boundingBox,
        data: section,
      });

      for (const pair of section.pairAnnotations || []) {
        boxes.push({
          id: pair.id,
          type: 'pair',
          box: pair.boundingBox,
          data: pair,
        });

        for (const element of pair.elementAnnotations || []) {
          boxes.push({
            id: element.id,
            type: 'element',
            box: element.boundingBox,
            data: element,
          });
        }
      }
    }

    return boxes;
  };

  // Get box color based on type
  const getBoxColor = (type: 'section' | 'pair' | 'element'): string => {
    switch (type) {
      case 'section':
        return '#4338ca';
      case 'pair':
        return '#5a7a3a';
      case 'element':
        return '#b91c1c';
      default:
        return '#6b5436';
    }
  };

  // Get box stroke style
  const getBoxStroke = (type: 'section' | 'pair' | 'element'): string => {
    if (type === 'section') return '2,4';
    return '';
  };

  // Start a pan gesture on the scrollable container. Optional onIdleUp fires
  // when mouseup happens without the drag threshold being exceeded (click only).
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

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 2) return;
    e.preventDefault(); // Prevent browser native drag behavior

    // Cmd/Ctrl + drag → pan the canvas (only needed with drawing tools;
    // in select mode plain drag pans, see below).
    if ((e.metaKey || e.ctrlKey) && currentTool !== 'select' &&
        !drawingRef.current.isDrawing &&
        !movingRef.current.isMoving &&
        !resizingRef.current.isResizing) {
      if (startPan(e)) return;
    }

    const coords = screenToImageCoords(e.clientX, e.clientY);

    // If currently moving, second click finalizes
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
          onMultiBoundingBoxUpdated(page.id, updates);
        } else {
          onBoundingBoxUpdated(page.id, movingRef.current.boxId, newBox);
        }
      }
      setMoving({ isMoving: false, boxId: '', originalBox: { x: 0, y: 0, width: 0, height: 0 }, offsetX: 0, offsetY: 0 });
      setMovePreview(null);
      multiMoveOriginsRef.current = new Map();
      return;
    }

    // If currently resizing, second click finalizes
    if (resizingRef.current.isResizing) {
      // Apply the final position via onBoundingBoxUpdated
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

      onBoundingBoxUpdated(page.id, r.boxId, newBox);
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

    // Check for resize handle click (first click starts resize) — disabled in multi-select
    if (selectedAnnotation && currentTool === 'select' && !isLocked(selectedAnnotation.id) && !isMultiSelect) {
      const selected = findAnnotationById(selectedAnnotation.id);
      if (selected) {
        const { x, y, width, height } = selected.data.boundingBox;

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
              originalBox: { ...selected.data.boundingBox },
              startX: coords.x,
              startY: coords.y,
            });
            return;
          }
        }
      }
    }

    // Check if clicking inside any selected box — start moving (works for single and multi)
    if (currentTool === 'select' && effectiveSelectedIds.size > 0 && !(e.metaKey || e.ctrlKey || e.shiftKey)) {
      for (const id of effectiveSelectedIds) {
        if (isLocked(id)) continue;
        const found = findAnnotationById(id);
        if (!found) continue;
        const { x, y, width, height } = found.data.boundingBox;
        if (coords.x >= x && coords.x <= x + width && coords.y >= y && coords.y <= y + height) {
          const origBox = { ...found.data.boundingBox };
          setMoving({
            isMoving: true,
            boxId: id,
            originalBox: origBox,
            offsetX: coords.x - x,
            offsetY: coords.y - y,
          });
          setMovePreview({ ...origBox });
          // Capture original boxes for other selected items
          const others = new Map<string, BoundingBox>();
          effectiveSelectedIds.forEach((otherId) => {
            if (otherId === id || isLocked(otherId)) return;
            const o = findAnnotationById(otherId);
            if (o) others.set(otherId, { ...o.data.boundingBox });
          });
          multiMoveOriginsRef.current = others;
          return;
        }
      }
    }

    // Check for clicking on existing annotations
    if (currentTool === 'select') {
      const additive = e.metaKey || e.ctrlKey || e.shiftKey;
      const boxes = getAllBoxes();
      for (let i = boxes.length - 1; i >= 0; i--) {
        const box = boxes[i];
        const { x, y, width, height } = box.box;

        if (
          coords.x >= x &&
          coords.x <= x + width &&
          coords.y >= y &&
          coords.y <= y + height
        ) {
          onAnnotationSelected({
            id: box.id,
            type: box.type,
            data: box.data,
          }, additive);
          return;
        }
      }
      // Empty area: plain drag pans the canvas; a click without drag deselects.
      const started = startPan(e, () => {
        if (!additive) onAnnotationSelected(null);
      });
      if (!started && !additive) onAnnotationSelected(null);
      return;
    }

    // Two-click drawing: first click = top-left, second click = bottom-right
    if (
      currentTool === 'section' ||
      currentTool === 'pair' ||
      currentTool === 'element'
    ) {
      if (!drawingRef.current.isDrawing) {
        // First click - set starting corner and attach mousemove to document
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
        // Second click - finalize bounding box and remove listener
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
          onAnnotationCreated({ x, y, width, height });
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

  // Resize preview state
  const [resizePreview, setResizePreviewState] = useState<BoundingBox | null>(null);
  const resizePreviewRef = useRef<BoundingBox | null>(null);
  const setResizePreview = (val: BoundingBox | null) => {
    resizePreviewRef.current = val;
    setResizePreviewState(val);
  };

  // Move preview state
  const [movePreview, setMovePreviewState] = useState<BoundingBox | null>(null);
  const movePreviewRef = useRef<BoundingBox | null>(null);
  const setMovePreview = (val: BoundingBox | null) => {
    movePreviewRef.current = val;
    setMovePreviewState(val);
  };


  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    // Handle move preview
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

    // Handle resize preview
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
    // No drag-based resize; resize is click-to-start / click-to-finish
  };

  // Render boxes
  const boxes = getAllBoxes();
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
          {/* Transparent background to capture mouse events */}
          <rect
            x={0}
            y={0}
            width={page.width}
            height={page.height}
            fill="transparent"
            pointerEvents="all"
          />
          {/* Render all boxes */}
          {boxes.map((box) => {
            const selected = isSelected(box.id);
            const primary = isPrimary(box.id);
            const isBeingResized = primary && resizing.isResizing;
            const isBeingMovedPrimary = moving.isMoving && moving.boxId === box.id;
            const hasLivePreview = livePreview && livePreview.id === box.id;
            // During group move, offset non-primary selected boxes by same delta
            let groupMoveBox: BoundingBox | null = null;
            if (moving.isMoving && movePreview && selected && !isBeingMovedPrimary) {
              const orig = multiMoveOriginsRef.current.get(box.id);
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
                    : box.box;
            const { x, y, width, height } = displayBox;
            const color = getBoxColor(box.type);
            const strokeDasharray = getBoxStroke(box.type);
            const orientation = hasLivePreview && livePreview!.orientation !== undefined
              ? livePreview!.orientation
              : Number(box.data?.orientation) || 0;
            const cx = x + width / 2;
            const cy = y + height / 2;
            const groupTransform = orientation ? `rotate(${orientation} ${cx} ${cy})` : undefined;

            return (
              <g key={box.id} transform={groupTransform}>
                {/* Rectangle */}
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={selected ? `${color}55` : `${color}10`}
                  stroke={color}
                  strokeWidth={selected ? 5 : 4}
                  strokeDasharray={isBeingResized || isBeingMovedPrimary || groupMoveBox ? '4,4' : strokeDasharray}
                  pointerEvents="none"
                />

                {/* Resize handles for the primary selected annotation (single-select only) */}
                {primary && currentTool === 'select' && !isMultiSelect && !isLocked(box.id) && (
                  <>
                    {HANDLE_POSITIONS.map((pos, idx) => {
                      const isActiveHandle = isBeingResized && resizing.handleIndex === idx;
                      // Use the ORIGINAL box position for handle click detection, not preview
                      const origBox = box.box;
                      const handleCX = origBox.x + origBox.width * pos.x;
                      const handleCY = origBox.y + origBox.height * pos.y;
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

                            // If already resizing, finalize on any handle click too
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
                              onBoundingBoxUpdated(page.id, r.boxId, nb);
                              setResizing({ isResizing: false, boxId: '', handleIndex: 0, originalBox: { x: 0, y: 0, width: 0, height: 0 }, startX: 0, startY: 0 });
                              setResizePreview(null);
                              return;
                            }

                            // Start resize using original box (not preview)
                            setResizing({
                              isResizing: true,
                              boxId: box.id,
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

                {/* Label for sections */}
                {box.type === 'section' && box.data.label && (
                  <text
                    x={x + 5}
                    y={y + 20}
                    fontSize={12 * (page.width / 512)}
                    fill={color}
                    pointerEvents="none"
                  >
                    {box.data.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Drawing preview - rectangle from start point to cursor */}
          {drawing.isDrawing && (() => {
            const color = currentTool === 'section' ? '#4338ca'
              : currentTool === 'pair' ? '#5a7a3a' : '#b91c1c';
            return (
              <rect
                x={Math.min(drawing.startX, drawing.currentX)}
                y={Math.min(drawing.startY, drawing.currentY)}
                width={Math.abs(drawing.currentX - drawing.startX)}
                height={Math.abs(drawing.currentY - drawing.startY)}
                fill={`${color}22`}
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

export default AnnotationCanvas;
