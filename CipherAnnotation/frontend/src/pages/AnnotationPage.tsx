/**
 * AnnotationPage Component
 * Main annotation workspace for drawing and managing annotations on manuscript pages
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LoadingSpinner, ConfirmDialog } from '@/components/shared';
import {
  AnnotationCanvas,
  AnnotationTreePanel,
  PropertiesPanel,
  Toolbar,
  PreprocessPanel,
  PreprocessOperation,
} from '@/components/annotation';
import { pageService } from '@/services';
import { useAnnotations } from '@/hooks';
import { Page, SectionAnnotation, PairAnnotation, ElementAnnotation, BoundingBox, ElementType, PreprocessHistoryEntry } from '@/types';

interface HistoryCommand {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

type ToolType = 'select' | 'section' | 'pair' | 'element';

interface SelectedAnnotation {
  id: string;
  type: 'section' | 'pair' | 'element';
  data: any;
}

export const AnnotationPage: React.FC = () => {
  const { documentId, pageId } = useParams<{
    documentId: string;
    pageId: string;
  }>();
  const navigate = useNavigate();

  // Page and annotation state
  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [pageList, setPageList] = useState<Page[]>([]);

  // Annotation state
  const {
    sections,
    fetchAnnotations,
    createSection,
    createPair,
    createElement,
    updateBoundingBox,
    updatePair,
    updateElement,
    deleteSection,
    deletePair,
    deleteElement,
    applyAnnotationUpdate,
  } = useAnnotations();

  // Keep a ref to current sections so history commands can snapshot current state
  const sectionsRef = useRef<SectionAnnotation[]>(sections);
  useEffect(() => {
    sectionsRef.current = sections;
  }, [sections]);

  // Id remap: when a deleted annotation is re-created via redo, the backend
  // returns a new id. Subsequent history commands reference the original id,
  // so we translate through this map at execution time.
  const idMap = useRef<Map<string, string>>(new Map());
  const resolveId = useCallback((id: string): string => {
    let current = id;
    const seen = new Set<string>();
    while (idMap.current.has(current) && !seen.has(current)) {
      seen.add(current);
      current = idMap.current.get(current)!;
    }
    return current;
  }, []);
  const remapId = useCallback((oldId: string, newId: string) => {
    if (oldId !== newId) idMap.current.set(oldId, newId);
  }, []);

  // UI state
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(100);
  const [selectedAnnotation, setSelectedAnnotation] =
    useState<SelectedAnnotation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showProcessed, setShowProcessed] = useState(true);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());

  // Preprocessing mode — local state only, persisted on Save
  const [isPreprocessOpen, setIsPreprocessOpen] = useState(false);
  const [preprocessOps, setPreprocessOps] = useState<PreprocessOperation[]>([]);
  const [isSavingPreprocess, setIsSavingPreprocess] = useState(false);
  const [isResettingPreprocess, setIsResettingPreprocess] = useState(false);
  const [isPreprocessHistoryBusy, setIsPreprocessHistoryBusy] = useState(false);
  const [preprocessHistory, setPreprocessHistory] = useState<PreprocessHistoryEntry[]>([]);
  // After a successful save, we offer to apply the same batch to every page in the document.
  const [applyAllPrompt, setApplyAllPrompt] = useState<{
    ops: { name: string; value?: number }[];
  } | null>(null);
  const [isApplyingToAll, setIsApplyingToAll] = useState(false);

  const fetchPreprocessHistory = useCallback(async () => {
    if (!documentId || !pageId) return;
    try {
      const state = await pageService.getPreprocessHistory(documentId, pageId);
      setPreprocessHistory(state.entries);
    } catch {
      // Non-fatal — history panel will just show empty state.
      setPreprocessHistory([]);
    }
  }, [documentId, pageId]);

  const handleSavePreprocess = async () => {
    if (!documentId || !pageId || preprocessOps.length === 0) return;
    try {
      setIsSavingPreprocess(true);
      const ops = preprocessOps.map((o) => ({
        name: o.name,
        ...(o.value !== undefined ? { value: o.value } : {}),
      }));
      await pageService.preprocessPage(documentId, pageId, ops);
      toast.success('Preprocessing applied');
      setPreprocessOps([]);
      await Promise.all([fetchPageData(), fetchPreprocessHistory()]);
      // Only prompt for apply-all when the document has more than one page.
      if (pageList.length > 1) {
        setApplyAllPrompt({ ops });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply preprocessing';
      toast.error(message);
    } finally {
      setIsSavingPreprocess(false);
    }
  };

  const handleConfirmApplyToAll = async () => {
    if (!documentId || !applyAllPrompt) return;
    try {
      setIsApplyingToAll(true);
      const result = await pageService.applyPreprocessToAllPages(
        documentId,
        applyAllPrompt.ops
      );
      if (result.failedCount > 0) {
        toast.error(
          `Applied to ${result.appliedCount} page(s), ${result.failedCount} failed`
        );
      } else {
        toast.success(`Applied to ${result.appliedCount} page(s)`);
      }
      setApplyAllPrompt(null);
      await Promise.all([fetchPageData(), fetchPreprocessHistory()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to apply to all pages';
      toast.error(message);
    } finally {
      setIsApplyingToAll(false);
    }
  };

  const handleUndoPreprocess = async () => {
    if (!documentId || !pageId) return;
    try {
      setIsPreprocessHistoryBusy(true);
      await pageService.undoPreprocess(documentId, pageId);
      setPreprocessOps([]);
      await Promise.all([fetchPageData(), fetchPreprocessHistory()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to undo';
      toast.error(message);
    } finally {
      setIsPreprocessHistoryBusy(false);
    }
  };

  const handleRedoPreprocess = async () => {
    if (!documentId || !pageId) return;
    try {
      setIsPreprocessHistoryBusy(true);
      await pageService.redoPreprocess(documentId, pageId);
      setPreprocessOps([]);
      await Promise.all([fetchPageData(), fetchPreprocessHistory()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to redo';
      toast.error(message);
    } finally {
      setIsPreprocessHistoryBusy(false);
    }
  };

  const handleResetPreprocess = async () => {
    if (!documentId || !pageId) return;
    try {
      setIsResettingPreprocess(true);
      await pageService.resetPreprocessing(documentId, pageId);
      toast.success('Preprocessing reset');
      setPreprocessOps([]);
      await Promise.all([fetchPageData(), fetchPreprocessHistory()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset preprocessing';
      toast.error(message);
    } finally {
      setIsResettingPreprocess(false);
    }
  };

  const handleClosePreprocess = () => {
    setIsPreprocessOpen(false);
    setPreprocessOps([]);
  };

  const handleTogglePreprocess = () => {
    if (isPreprocessOpen) {
      handleClosePreprocess();
    } else {
      setIsPreprocessOpen(true);
      setSelectedAnnotation(null);
      setSelectedIds(new Set());
      setCurrentTool('select');
    }
  };

  // Keep selectedAnnotation.data in sync with fresh sections after external
  // mutations (e.g. drag-move) — otherwise stale data leaks into PropertiesPanel,
  // which fires a stale livePreview that snaps the box back to its pre-move box.
  useEffect(() => {
    setSelectedAnnotation((prev) => {
      if (!prev) return prev;
      for (const s of sections) {
        if (s.id === prev.id) return prev.data === s ? prev : { ...prev, data: s };
        for (const p of s.pairAnnotations ?? []) {
          if (p.id === prev.id) return prev.data === p ? prev : { ...prev, data: p };
          for (const e of p.elementAnnotations ?? []) {
            if (e.id === prev.id) return prev.data === e ? prev : { ...prev, data: e };
          }
        }
      }
      return prev;
    });
  }, [sections]);

  // Locate any annotation by id across sections/pairs/elements
  const findAnyById = useCallback((id: string): SelectedAnnotation | null => {
    for (const s of sectionsRef.current) {
      if (s.id === id) return { id: s.id, type: 'section', data: s };
      for (const p of s.pairAnnotations ?? []) {
        if (p.id === id) return { id: p.id, type: 'pair', data: p };
        for (const e of p.elementAnnotations ?? []) {
          if (e.id === id) return { id: e.id, type: 'element', data: e };
        }
      }
    }
    return null;
  }, []);

  const handleSelectAnnotation = useCallback(
    (ann: SelectedAnnotation | null, additive = false) => {
      if (!ann) {
        setSelectedAnnotation(null);
        setSelectedIds(new Set());
        return;
      }
      if (!additive) {
        setSelectedAnnotation(ann);
        setSelectedIds(new Set([ann.id]));
        return;
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(ann.id)) {
          next.delete(ann.id);
          if (selectedAnnotation?.id === ann.id) {
            const nextPrimary = next.values().next().value;
            setSelectedAnnotation(nextPrimary ? findAnyById(nextPrimary) : null);
          }
        } else {
          next.add(ann.id);
          setSelectedAnnotation(ann);
        }
        return next;
      });
    },
    [selectedAnnotation, findAnyById]
  );

  const toggleLock = useCallback((id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Effective locks propagate from ancestors to descendants.
  const effectivelyLockedIds = React.useMemo(() => {
    const result = new Set<string>();
    for (const section of sections) {
      const sectionLocked = lockedIds.has(section.id);
      if (sectionLocked) result.add(section.id);
      for (const pair of section.pairAnnotations || []) {
        const pairLocked = sectionLocked || lockedIds.has(pair.id);
        if (pairLocked) result.add(pair.id);
        for (const element of pair.elementAnnotations || []) {
          if (pairLocked || lockedIds.has(element.id)) result.add(element.id);
        }
      }
    }
    return result;
  }, [sections, lockedIds]);
  const [history, setHistory] = useState<HistoryCommand[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);
  const isReplayingRef = useRef(false);

  const batchingRef = useRef(false);
  const batchCommandsRef = useRef<HistoryCommand[]>([]);

  const pushCommand = useCallback((cmd: HistoryCommand) => {
    if (isReplayingRef.current) return;
    if (batchingRef.current) {
      batchCommandsRef.current.push(cmd);
      return;
    }
    setHistory((prev) => prev.slice(0, historyIndexRef.current + 1).concat(cmd));
    setHistoryIndex((i) => i + 1);
  }, []);

  // Run an async block and collapse all commands it pushes into a single
  // undo/redo step, so multi-selection operations undo atomically.
  const runInBatch = useCallback(async (fn: () => Promise<void>) => {
    if (batchingRef.current) { await fn(); return; }
    batchingRef.current = true;
    batchCommandsRef.current = [];
    try {
      await fn();
    } finally {
      const cmds = batchCommandsRef.current;
      batchingRef.current = false;
      batchCommandsRef.current = [];
      if (cmds.length === 1) {
        setHistory((prev) => prev.slice(0, historyIndexRef.current + 1).concat(cmds[0]));
        setHistoryIndex((i) => i + 1);
      } else if (cmds.length > 1) {
        const combined: HistoryCommand = {
          undo: async () => { for (let i = cmds.length - 1; i >= 0; i--) await cmds[i].undo(); },
          redo: async () => { for (const c of cmds) await c.redo(); },
        };
        setHistory((prev) => prev.slice(0, historyIndexRef.current + 1).concat(combined));
        setHistoryIndex((i) => i + 1);
      }
    }
  }, []);
  const [livePreview, setLivePreview] = useState<{
    id: string;
    orientation?: number;
    boundingBox?: BoundingBox;
  } | null>(null);

  // Fetch page and annotations on mount
  useEffect(() => {
    if (pageId && documentId) {
      fetchPageData();
      fetchPreprocessHistory();
    }
  }, [pageId, documentId, fetchPreprocessHistory]);

  const fetchPageData = async () => {
    if (!pageId || !documentId) return;

    try {
      setIsLoading(true);
      const pageData = await pageService.getPage(documentId, pageId);
      setPage(pageData);

      // Get page count from document
      const pages = await pageService.getPages(documentId);
      setPageCount(pages.length);
      setPageList(pages);

      // Fetch annotations
      await fetchAnnotations(pageId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load page';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Find helpers for locating annotations in current state snapshot
  const findSection = useCallback((id: string) =>
    sectionsRef.current.find((s) => s.id === id), []);
  const findPairWithParent = useCallback((id: string) => {
    for (const s of sectionsRef.current) {
      const p = s.pairAnnotations?.find((pp) => pp.id === id);
      if (p) return { section: s, pair: p };
    }
    return null;
  }, []);
  const findElementWithParent = useCallback((id: string) => {
    for (const s of sectionsRef.current) {
      for (const p of s.pairAnnotations ?? []) {
        const e = p.elementAnnotations?.find((ee) => ee.id === id);
        if (e) return { section: s, pair: p, element: e };
      }
    }
    return null;
  }, []);

  // Tracked mutations: each recorded to history so they can be undone/redone.
  const trackedDeleteSection = useCallback(async (pId: string, sectionId: string) => {
    const realId = resolveId(sectionId);
    const snapshot = findSection(realId);
    await deleteSection(pId, realId);
    if (snapshot) {
      pushCommand({
        undo: async () => {
          const restored = await createSection(pId, {
            label: snapshot.label,
            orientation: snapshot.orientation,
            boundingBox: snapshot.boundingBox,
          });
          remapId(realId, restored.id);
          for (const p of snapshot.pairAnnotations ?? []) {
            const rp = await createPair(pId, restored.id, {
              order: p.order,
              orientation: p.orientation,
              boundingBox: p.boundingBox,
            });
            remapId(p.id, rp.id);
            for (const e of p.elementAnnotations ?? []) {
              const re = await createElement(pId, rp.id, {
                type: e.type,
                content: e.content,
                transcription: e.transcription,
                symbolId: e.symbolId,
                orientation: e.orientation,
                boundingBox: e.boundingBox,
              });
              remapId(e.id, re.id);
            }
          }
        },
        redo: async () => {
          await deleteSection(pId, resolveId(realId));
        },
      });
    }
  }, [deleteSection, createSection, createPair, createElement, findSection, pushCommand, resolveId, remapId]);

  const trackedDeletePair = useCallback(async (pId: string, pairId: string) => {
    const realId = resolveId(pairId);
    const found = findPairWithParent(realId);
    await deletePair(pId, realId);
    if (found) {
      const { section, pair } = found;
      pushCommand({
        undo: async () => {
          const restored = await createPair(pId, resolveId(section.id), {
            order: pair.order,
            orientation: pair.orientation,
            boundingBox: pair.boundingBox,
          });
          remapId(realId, restored.id);
          for (const e of pair.elementAnnotations ?? []) {
            const re = await createElement(pId, restored.id, {
              type: e.type,
              content: e.content,
              transcription: e.transcription,
              symbolId: e.symbolId,
              orientation: e.orientation,
              boundingBox: e.boundingBox,
            });
            remapId(e.id, re.id);
          }
        },
        redo: async () => {
          await deletePair(pId, resolveId(realId));
        },
      });
    }
  }, [deletePair, createPair, createElement, findPairWithParent, pushCommand, resolveId, remapId]);

  const trackedDeleteElement = useCallback(async (pId: string, elementId: string) => {
    const realId = resolveId(elementId);
    const found = findElementWithParent(realId);
    await deleteElement(pId, realId);
    if (found) {
      const { pair, element } = found;
      pushCommand({
        undo: async () => {
          const restored = await createElement(pId, resolveId(pair.id), {
            type: element.type,
            content: element.content,
            transcription: element.transcription,
            symbolId: element.symbolId,
            orientation: element.orientation,
            boundingBox: element.boundingBox,
          });
          remapId(realId, restored.id);
        },
        redo: async () => {
          await deleteElement(pId, resolveId(realId));
        },
      });
    }
  }, [deleteElement, createElement, findElementWithParent, pushCommand, resolveId, remapId]);

  // Handle delete on Backspace/Delete key (supports multi-selection)
  const handleDeleteSelected = useCallback(async () => {
    if (!pageId || selectedIds.size === 0) return;

    // Gather typed annotations for every selected id
    const targets: Array<{ id: string; type: 'section' | 'pair' | 'element' }> = [];
    for (const id of selectedIds) {
      const found = findAnyById(id);
      if (found) targets.push({ id: found.id, type: found.type });
    }
    if (targets.length === 0) return;

    // Delete leaves first so parents still exist when children are removed
    const priority = { element: 0, pair: 1, section: 2 } as const;
    targets.sort((a, b) => priority[a.type] - priority[b.type]);

    // Skip descendants when an ancestor is also selected — backend cascades
    const selectedSet = new Set(targets.map((t) => t.id));
    const filtered = targets.filter((t) => {
      if (t.type === 'element') {
        const parent = findElementWithParent(t.id);
        if (!parent) return false;
        return !selectedSet.has(parent.pair.id) && !selectedSet.has(parent.section.id);
      }
      if (t.type === 'pair') {
        const parent = findPairWithParent(t.id);
        if (!parent) return false;
        return !selectedSet.has(parent.section.id);
      }
      return true;
    });

    try {
      await runInBatch(async () => {
        for (const item of filtered) {
          if (item.type === 'section') await trackedDeleteSection(pageId, item.id);
          else if (item.type === 'pair') await trackedDeletePair(pageId, item.id);
          else await trackedDeleteElement(pageId, item.id);
        }
      });
      toast.success(
        targets.length === 1
          ? `${targets[0].type.charAt(0).toUpperCase() + targets[0].type.slice(1)} deleted`
          : `Deleted ${targets.length} annotations`
      );
      setSelectedAnnotation(null);
      setSelectedIds(new Set());
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete annotation';
      toast.error(message);
    }
  }, [selectedIds, pageId, trackedDeleteSection, trackedDeletePair, trackedDeleteElement, findAnyById, findElementWithParent, findPairWithParent, runInBatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleDeleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedAnnotation(null);
        setSelectedIds(new Set());
        setLivePreview(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeleteSelected]);

  // Handle navigation to different pages
  const handlePrevPage = () => {
    if (!page || !documentId) return;
    const prev = pageList.find((p) => p.pageNumber === page.pageNumber - 1);
    if (prev) {
      navigate(`/documents/${documentId}/annotate/${prev.id}`);
    }
  };

  const handleNextPage = () => {
    if (!page || !documentId) return;
    const next = pageList.find((p) => p.pageNumber === page.pageNumber + 1);
    if (next) {
      navigate(`/documents/${documentId}/annotate/${next.id}`);
    }
  };

  // Check how much of childBox's area overlaps with parentBox (0-1)
  const getOverlapRatio = (child: BoundingBox, parent: BoundingBox): number => {
    const overlapX = Math.max(0, Math.min(child.x + child.width, parent.x + parent.width) - Math.max(child.x, parent.x));
    const overlapY = Math.max(0, Math.min(child.y + child.height, parent.y + parent.height) - Math.max(child.y, parent.y));
    const overlapArea = overlapX * overlapY;
    const childArea = child.width * child.height;
    return childArea > 0 ? overlapArea / childArea : 0;
  };

  // Find the best parent section for a pair based on bounding box overlap
  const findParentSection = (boundingBox: BoundingBox) => {
    let bestSection: SectionAnnotation | null = null;
    let bestOverlap = 0;
    for (const section of sections) {
      const overlap = getOverlapRatio(boundingBox, section.boundingBox);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestSection = section;
      }
    }
    return bestOverlap > 0.3 ? bestSection : null;
  };

  // Find the best parent pair for an element based on bounding box overlap
  const findParentPair = (boundingBox: BoundingBox) => {
    let bestPair: { sectionId: string; pair: any } | null = null;
    let bestOverlap = 0;
    for (const section of sections) {
      for (const pair of section.pairAnnotations || []) {
        const overlap = getOverlapRatio(boundingBox, pair.boundingBox);
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestPair = { sectionId: section.id, pair };
        }
      }
    }
    return bestOverlap >= 0.8 ? bestPair : null;
  };

  const DUPLICATE_OFFSET = 10;

  // Find the current bounding box of any annotation by id (used to capture pre-update state)
  const findBoundingBox = useCallback((id: string): BoundingBox | null => {
    for (const s of sectionsRef.current) {
      if (s.id === id) return s.boundingBox;
      for (const p of s.pairAnnotations ?? []) {
        if (p.id === id) return p.boundingBox;
        for (const el of p.elementAnnotations ?? []) {
          if (el.id === id) return el.boundingBox;
        }
      }
    }
    return null;
  }, []);

  // Minimum portion of each child that must remain inside the parent bounds after a parent move.
  // Allows small tolerance so children don't need to be pixel-perfect inside.
  const CHILD_CONTAINMENT_THRESHOLD = 0.8;

  // If moving a parent (section/pair), verify all its children still overlap the new bounds enough
  const childrenWouldEscape = (id: string, newBox: BoundingBox): boolean => {
    const escapes = (child: BoundingBox) =>
      getOverlapRatio(child, newBox) < CHILD_CONTAINMENT_THRESHOLD;

    for (const s of sectionsRef.current) {
      if (s.id === id) {
        for (const p of s.pairAnnotations ?? []) {
          if (escapes(p.boundingBox)) return true;
          for (const el of p.elementAnnotations ?? []) {
            if (escapes(el.boundingBox)) return true;
          }
        }
        return false;
      }
      for (const p of s.pairAnnotations ?? []) {
        if (p.id === id) {
          for (const el of p.elementAnnotations ?? []) {
            if (escapes(el.boundingBox)) return true;
          }
          return false;
        }
      }
    }
    return false;
  };

  // Update bounding box and reparent pair/element if the new position falls under a different parent
  const handleBoundingBoxUpdated = async (pId: string, boxId: string, box: BoundingBox) => {
    const realId = resolveId(boxId);
    const oldBox = findBoundingBox(realId);

    if (childrenWouldEscape(realId, box)) {
      toast.error('Nie je možné presunúť rodiča - niektoré detské elementy by zostali mimo jeho hraníc.');
      return null;
    }

    // If moving an element, require at least 80% of its area to remain inside some pair
    let isElement = false;
    for (const s of sectionsRef.current) {
      for (const p of s.pairAnnotations ?? []) {
        if ((p.elementAnnotations ?? []).some((el) => el.id === realId)) {
          isElement = true;
          break;
        }
      }
      if (isElement) break;
    }
    if (isElement && !findParentPair(box)) {
      toast.error('Element musí mať aspoň 80 % svojej plochy vo vnútri nejakého páru.');
      return null;
    }

    const updated = await updateBoundingBox(pId, realId, box);

    // Track reparenting if applicable
    let reparent: { type: 'pair' | 'element'; oldParentId: string; newParentId: string } | null = null;

    outer: for (const s of sectionsRef.current) {
      if (s.id === realId) break; // section has no parent to reassign
      for (const p of s.pairAnnotations ?? []) {
        if (p.id === realId) {
          const newParent = findParentSection(box);
          if (newParent && newParent.id !== s.id) {
            await updatePair(pId, realId, { sectionId: newParent.id });
            reparent = { type: 'pair', oldParentId: s.id, newParentId: newParent.id };
          }
          break outer;
        }
        for (const el of p.elementAnnotations ?? []) {
          if (el.id === realId) {
            const newParent = findParentPair(box);
            if (newParent && newParent.pair.id !== p.id) {
              await updateElement(pId, realId, { pairId: newParent.pair.id });
              reparent = { type: 'element', oldParentId: p.id, newParentId: newParent.pair.id };
            }
            break outer;
          }
        }
      }
    }

    if (oldBox) {
      const capturedReparent = reparent;
      pushCommand({
        undo: async () => {
          await updateBoundingBox(pId, resolveId(realId), oldBox);
          if (capturedReparent?.type === 'pair') {
            await updatePair(pId, resolveId(realId), { sectionId: resolveId(capturedReparent.oldParentId) });
          } else if (capturedReparent?.type === 'element') {
            await updateElement(pId, resolveId(realId), { pairId: resolveId(capturedReparent.oldParentId) });
          }
        },
        redo: async () => {
          await updateBoundingBox(pId, resolveId(realId), box);
          if (capturedReparent?.type === 'pair') {
            await updatePair(pId, resolveId(realId), { sectionId: resolveId(capturedReparent.newParentId) });
          } else if (capturedReparent?.type === 'element') {
            await updateElement(pId, resolveId(realId), { pairId: resolveId(capturedReparent.newParentId) });
          }
        },
      });
    }

    return updated;
  };

  // Tracked creation helpers - record in history for undo/redo
  const trackedCreateSection = useCallback(async (
    pId: string,
    data: { label?: string; orientation?: number; boundingBox: BoundingBox }
  ) => {
    const created = await createSection(pId, data);
    const originalId = created.id;
    pushCommand({
      undo: async () => {
        await deleteSection(pId, resolveId(originalId));
      },
      redo: async () => {
        const recreated = await createSection(pId, data);
        remapId(originalId, recreated.id);
      },
    });
    return created;
  }, [createSection, deleteSection, pushCommand, resolveId, remapId]);

  const trackedCreatePair = useCallback(async (
    pId: string,
    sectionId: string,
    data: { order: number; orientation?: number; boundingBox: BoundingBox }
  ) => {
    const created = await createPair(pId, sectionId, data);
    const originalId = created.id;
    pushCommand({
      undo: async () => {
        await deletePair(pId, resolveId(originalId));
      },
      redo: async () => {
        const recreated = await createPair(pId, resolveId(sectionId), data);
        remapId(originalId, recreated.id);
      },
    });
    return created;
  }, [createPair, deletePair, pushCommand, resolveId, remapId]);

  const trackedCreateElement = useCallback(async (
    pId: string,
    pairId: string,
    data: { type: ElementType; content?: string; transcription?: string; symbolId?: string; orientation?: number; boundingBox: BoundingBox }
  ) => {
    const created = await createElement(pId, pairId, data);
    const originalId = created.id;
    pushCommand({
      undo: async () => {
        await deleteElement(pId, resolveId(originalId));
      },
      redo: async () => {
        const recreated = await createElement(pId, resolveId(pairId), data);
        remapId(originalId, recreated.id);
      },
    });
    return created;
  }, [createElement, deleteElement, pushCommand, resolveId, remapId]);

  // Handle duplication of element
  const handleDuplicateElement = async (element: ElementAnnotation, pairId: string) => {
    if (!pageId) return;
    try {
      const newElement = await trackedCreateElement(pageId, pairId, {
        type: element.type,
        content: element.content,
        transcription: element.transcription,
        symbolId: element.symbolId,
        orientation: element.orientation,
        boundingBox: { ...element.boundingBox, x: element.boundingBox.x + DUPLICATE_OFFSET, y: element.boundingBox.y + DUPLICATE_OFFSET },
      });
      setSelectedAnnotation({ id: newElement.id, type: 'element', data: newElement });
      toast.success('Element duplicated');
    } catch (error) {
      toast.error('Failed to duplicate element');
    }
  };

  // Handle duplication of pair (only the pair itself, no children)
  const handleDuplicatePair = async (pair: PairAnnotation, sectionId: string) => {
    if (!pageId) return;
    try {
      const newPair = await trackedCreatePair(pageId, sectionId, {
        order: pair.order,
        orientation: pair.orientation,
        boundingBox: { ...pair.boundingBox, x: pair.boundingBox.x + DUPLICATE_OFFSET, y: pair.boundingBox.y + DUPLICATE_OFFSET },
      });
      setSelectedAnnotation({ id: newPair.id, type: 'pair', data: newPair });
      toast.success('Pair duplicated');
    } catch (error) {
      toast.error('Failed to duplicate pair');
    }
  };

  // Duplicate all currently selected annotations as a single history step
  const handleDuplicateSelected = useCallback(async () => {
    if (!pageId || selectedIds.size === 0) return;
    const items: Array<SelectedAnnotation> = [];
    for (const id of selectedIds) {
      const found = findAnyById(id);
      if (found) items.push(found);
    }
    if (items.length === 0) return;

    try {
      const created: Array<{ id: string; type: 'section' | 'pair' | 'element' }> = [];
      await runInBatch(async () => {
        for (const item of items) {
          if (item.type === 'element') {
            const found = findElementWithParent(item.id);
            if (!found) continue;
            const el = found.element;
            const newEl = await trackedCreateElement(pageId, found.pair.id, {
              type: el.type,
              content: el.content,
              transcription: el.transcription,
              symbolId: el.symbolId,
              orientation: el.orientation,
              boundingBox: { ...el.boundingBox, x: el.boundingBox.x + DUPLICATE_OFFSET, y: el.boundingBox.y + DUPLICATE_OFFSET },
            });
            created.push({ id: newEl.id, type: 'element' });
          } else if (item.type === 'pair') {
            const found = findPairWithParent(item.id);
            if (!found) continue;
            const p = found.pair;
            const newPair = await trackedCreatePair(pageId, found.section.id, {
              order: p.order,
              orientation: p.orientation,
              boundingBox: { ...p.boundingBox, x: p.boundingBox.x + DUPLICATE_OFFSET, y: p.boundingBox.y + DUPLICATE_OFFSET },
            });
            created.push({ id: newPair.id, type: 'pair' });
          } else {
            const s = findSection(item.id);
            if (!s) continue;
            const newSec = await trackedCreateSection(pageId, {
              label: s.label,
              orientation: s.orientation,
              boundingBox: { ...s.boundingBox, x: s.boundingBox.x + DUPLICATE_OFFSET, y: s.boundingBox.y + DUPLICATE_OFFSET },
            });
            created.push({ id: newSec.id, type: 'section' });
          }
        }
      });
      if (created.length > 0) {
        setSelectedIds(new Set(created.map((c) => c.id)));
        const primary = created[0];
        const resolved = findAnyById(primary.id);
        if (resolved) setSelectedAnnotation(resolved);
        toast.success(created.length === 1 ? 'Duplicated' : `Duplicated ${created.length} annotations`);
      }
    } catch (error) {
      toast.error('Failed to duplicate');
    }
  }, [pageId, selectedIds, findAnyById, findSection, findPairWithParent, findElementWithParent, trackedCreateSection, trackedCreatePair, trackedCreateElement, runInBatch]);

  // Move all selected boxes by applying identical (dx, dy) deltas atomically.
  // Per item, reassign parent if the new box falls under a different section/pair.
  const handleMultiBoundingBoxUpdated = async (
    pId: string,
    updates: Array<{ id: string; box: BoundingBox }>
  ) => {
    if (updates.length === 0) return;

    // Pre-validate: parents must keep their children, elements must remain inside some pair
    for (const u of updates) {
      const realId = resolveId(u.id);
      if (childrenWouldEscape(realId, u.box)) {
        toast.error('Nie je možné presunúť rodiča - niektoré detské elementy by zostali mimo jeho hraníc.');
        return;
      }
      let isElement = false;
      for (const s of sectionsRef.current) {
        for (const p of s.pairAnnotations ?? []) {
          if ((p.elementAnnotations ?? []).some((el) => el.id === realId)) {
            isElement = true;
            break;
          }
        }
        if (isElement) break;
      }
      if (isElement && !findParentPair(u.box)) {
        toast.error('Element musí mať aspoň 80 % svojej plochy vo vnútri nejakého páru.');
        return;
      }
    }

    await runInBatch(async () => {
      for (const u of updates) {
        const realId = resolveId(u.id);
        const oldBox = findBoundingBox(realId);
        await updateBoundingBox(pId, realId, u.box);

        let reparent: { type: 'pair' | 'element'; oldParentId: string; newParentId: string } | null = null;
        outer: for (const s of sectionsRef.current) {
          if (s.id === realId) break;
          for (const p of s.pairAnnotations ?? []) {
            if (p.id === realId) {
              const newParent = findParentSection(u.box);
              if (newParent && newParent.id !== s.id) {
                await updatePair(pId, realId, { sectionId: newParent.id });
                reparent = { type: 'pair', oldParentId: s.id, newParentId: newParent.id };
              }
              break outer;
            }
            for (const el of p.elementAnnotations ?? []) {
              if (el.id === realId) {
                const newParent = findParentPair(u.box);
                if (newParent && newParent.pair.id !== p.id) {
                  await updateElement(pId, realId, { pairId: newParent.pair.id });
                  reparent = { type: 'element', oldParentId: p.id, newParentId: newParent.pair.id };
                }
                break outer;
              }
            }
          }
        }

        if (oldBox) {
          const capturedNew = u.box;
          const capturedReparent = reparent;
          pushCommand({
            undo: async () => {
              await updateBoundingBox(pId, resolveId(realId), oldBox);
              if (capturedReparent?.type === 'pair') {
                await updatePair(pId, resolveId(realId), { sectionId: resolveId(capturedReparent.oldParentId) });
              } else if (capturedReparent?.type === 'element') {
                await updateElement(pId, resolveId(realId), { pairId: resolveId(capturedReparent.oldParentId) });
              }
            },
            redo: async () => {
              await updateBoundingBox(pId, resolveId(realId), capturedNew);
              if (capturedReparent?.type === 'pair') {
                await updatePair(pId, resolveId(realId), { sectionId: resolveId(capturedReparent.newParentId) });
              } else if (capturedReparent?.type === 'element') {
                await updateElement(pId, resolveId(realId), { pairId: resolveId(capturedReparent.newParentId) });
              }
            },
          });
        }
      }
    });
  };

  // Handle duplication of section (only the section itself, no children)
  const handleDuplicateSection = async (section: SectionAnnotation) => {
    if (!pageId) return;
    try {
      const newSection = await trackedCreateSection(pageId, {
        label: section.label,
        orientation: section.orientation,
        boundingBox: { ...section.boundingBox, x: section.boundingBox.x + DUPLICATE_OFFSET, y: section.boundingBox.y + DUPLICATE_OFFSET },
      });
      setSelectedAnnotation({ id: newSection.id, type: 'section', data: newSection });
      toast.success('Section duplicated');
    } catch (error) {
      toast.error('Failed to duplicate section');
    }
  };

  // Handle annotation creation
  const handleAnnotationCreated = async (
    boundingBox: { x: number; y: number; width: number; height: number }
  ) => {
    if (!pageId) return;

    try {
      if (currentTool === 'section') {
        const section = await trackedCreateSection(pageId, {
          boundingBox,
          orientation: 0,
        });
        toast.success('Section created');
        setSelectedAnnotation({
          id: section.id,
          type: 'section',
          data: section,
        });
      } else if (currentTool === 'pair') {
        const parentSection = findParentSection(boundingBox);
        if (!parentSection) {
          toast.error('Draw the pair inside a section bounding box');
          return;
        }
        const pairCount = parentSection.pairAnnotations?.length || 0;
        const pair = await trackedCreatePair(pageId, parentSection.id, {
          boundingBox,
          orientation: 0,
          order: pairCount + 1,
        });
        toast.success('Pair created');
        setSelectedAnnotation({
          id: pair.id,
          type: 'pair',
          data: pair,
        });
      } else if (currentTool === 'element') {
        const parentPair = findParentPair(boundingBox);
        if (!parentPair) {
          toast.error('Element musí mať aspoň 80 % svojej plochy vo vnútri nejakého páru.');
          return;
        }
        const element = await trackedCreateElement(pageId, parentPair.pair.id, {
          boundingBox,
          orientation: 0,
          type: 'Plaintext',
        });
        toast.success('Element created');
        setSelectedAnnotation({
          id: element.id,
          type: 'element',
          data: element,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create annotation';
      toast.error(message);
    }
  };

  // Handle zoom changes
  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  // Handle undo/redo
  const handleUndo = useCallback(async () => {
    if (historyIndex < 0 || isReplayingRef.current) return;
    const cmd = history[historyIndex];
    if (!cmd) return;
    isReplayingRef.current = true;
    try {
      await cmd.undo();
      setHistoryIndex((i) => i - 1);
      setSelectedAnnotation(null);
    } catch (error) {
      toast.error('Undo failed');
    } finally {
      isReplayingRef.current = false;
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(async () => {
    if (historyIndex >= history.length - 1 || isReplayingRef.current) return;
    const cmd = history[historyIndex + 1];
    if (!cmd) return;
    isReplayingRef.current = true;
    try {
      await cmd.redo();
      setHistoryIndex((i) => i + 1);
      setSelectedAnnotation(null);
    } catch (error) {
      toast.error('Redo failed');
    } finally {
      isReplayingRef.current = false;
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'y') || (e.key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo, handleDuplicateSelected]);

  // Reset history when page changes
  useEffect(() => {
    setHistory([]);
    setHistoryIndex(-1);
    idMap.current.clear();
  }, [pageId]);

  if (isLoading) return <LoadingSpinner />;
  if (!page) return <div className="text-center py-12 text-ink-900/60 font-serif italic text-lg">Page not found</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-parchment-100">
      {/* Toolbar */}
      <Toolbar
        currentTool={currentTool}
        zoom={zoom}
        onToolChange={setCurrentTool}
        onZoomChange={handleZoomChange}
        showProcessed={showProcessed}
        onToggleImage={setShowProcessed}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        pageNumber={page.pageNumber}
        pageCount={pageCount}
        onPrevPage={handlePrevPage}
        onNextPage={handleNextPage}
        documentId={documentId || ''}
        isPreprocessOpen={isPreprocessOpen}
        onTogglePreprocess={handleTogglePreprocess}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Annotation tree */}
        <div className="w-80 border-r border-sepia-600/20 bg-parchment-50 overflow-y-auto">
          <AnnotationTreePanel
            sections={sections}
            selectedAnnotation={selectedAnnotation}
            selectedIds={selectedIds}
            onSelectAnnotation={handleSelectAnnotation}
            onDeleteSection={trackedDeleteSection}
            onDeletePair={trackedDeletePair}
            onDeleteElement={trackedDeleteElement}
            onDuplicateSection={handleDuplicateSection}
            onDuplicatePair={handleDuplicatePair}
            onDuplicateElement={handleDuplicateElement}
            onDuplicateSelected={handleDuplicateSelected}
            lockedIds={lockedIds}
            effectivelyLockedIds={effectivelyLockedIds}
            onToggleLock={toggleLock}
            pageId={pageId!}
          />
        </div>

        {/* Center - Canvas area */}
        <div className="flex-1 bg-parchment-200/50 overflow-hidden">
          {page && (
            <AnnotationCanvas
              page={page}
              annotations={sections}
              currentTool={currentTool}
              zoom={zoom}
              selectedAnnotation={selectedAnnotation}
              selectedIds={selectedIds}
              onAnnotationCreated={handleAnnotationCreated}
              onAnnotationSelected={(ann, additive) => {
                handleSelectAnnotation(ann, additive);
                setLivePreview(null);
              }}
              onBoundingBoxUpdated={handleBoundingBoxUpdated}
              onMultiBoundingBoxUpdated={handleMultiBoundingBoxUpdated}
              showProcessed={showProcessed}
              livePreview={livePreview}
              lockedIds={effectivelyLockedIds}
              previewOps={isPreprocessOpen ? preprocessOps : undefined}
              annotationsDisabled={isPreprocessOpen}
            />
          )}
        </div>

        {/* Right sidebar - Properties or Preprocess panel */}
        <div className="w-72 border-l border-sepia-600/20 bg-parchment-50 overflow-y-auto">
          {isPreprocessOpen ? (
            <PreprocessPanel
              operations={preprocessOps}
              onOperationsChange={setPreprocessOps}
              onSave={handleSavePreprocess}
              onReset={handleResetPreprocess}
              onClose={handleClosePreprocess}
              isSaving={isSavingPreprocess}
              isResetting={isResettingPreprocess}
              onUndo={handleUndoPreprocess}
              onRedo={handleRedoPreprocess}
              canUndo={Boolean(page.canUndoPreprocess)}
              canRedo={Boolean(page.canRedoPreprocess)}
              isHistoryBusy={isPreprocessHistoryBusy}
              history={preprocessHistory}
            />
          ) : (
          <PropertiesPanel
            selectedAnnotation={selectedAnnotation}
            pageId={pageId!}
            pageImageUrl={showProcessed ? (page.processedImageUrl ?? page.imageUrl) : page.imageUrl}
            pageWidth={page.width}
            pageHeight={page.height}
            onAnnotationUpdated={(updated) => {
              const type = selectedAnnotation!.type;
              applyAnnotationUpdate(type, updated);
              setSelectedAnnotation({
                ...selectedAnnotation!,
                data: updated,
              });
              setLivePreview(null);
            }}
            onLivePreview={(preview) => setLivePreview(preview)}
            onDelete={handleDeleteSelected}
          />
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={applyAllPrompt !== null}
        onClose={() => {
          if (!isApplyingToAll) setApplyAllPrompt(null);
        }}
        onConfirm={handleConfirmApplyToAll}
        title="Apply to all pages?"
        message={`Apply these preprocess operations to every page of this document (${pageList.length} pages)? The operations will be chained on top of each page's current state, and each page will get its own undo history entry.`}
        confirmText="Apply to all pages"
        cancelText="Only this page"
        isLoading={isApplyingToAll}
      />
    </div>
  );
};

export default AnnotationPage;
