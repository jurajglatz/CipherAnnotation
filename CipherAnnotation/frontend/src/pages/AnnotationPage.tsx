/**
 * AnnotationPage Component
 * Main annotation workspace for drawing and managing annotations on manuscript pages.
 * Unified data model: a single Annotation entity with a per-document Caption.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LoadingSpinner, ConfirmDialog } from '@/components/shared';
import {
  AnnotationCanvas,
  AnnotationTreePanel,
  CaptionsPanel,
  PropertiesPanel,
  Toolbar,
  PreprocessPanel,
  PreprocessOperation,
} from '@/components/annotation';
import { findDeepestContainer, isDescendantOf } from '@/components/annotation/AnnotationCanvas';
import { pageService, annotationService, documentService } from '@/services';
import { useAnnotations, useCaptions, useTour } from '@/hooks';
import {
  Page,
  Annotation,
  BoundingBox,
  PreprocessHistoryEntry,
  MyPermission,
} from '@/types';
import { CreateAnnotationData, UpdateAnnotationData } from '@/services/annotationService';

interface HistoryCommand {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

type ToolType = 'select' | 'annotation';

export const AnnotationPage: React.FC = () => {
  const { documentId, pageId } = useParams<{
    documentId: string;
    pageId: string;
  }>();
  const navigate = useNavigate();
  useTour('annotation');

  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [pageList, setPageList] = useState<Page[]>([]);
  const [myPermission, setMyPermission] = useState<MyPermission>('Read');
  const canEdit = myPermission === 'Owner' || myPermission === 'Edit';
  const readOnly = !canEdit;

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    documentService
      .getDocument(documentId)
      .then((doc) => {
        if (!cancelled) setMyPermission(doc.myPermission);
      })
      .catch(() => {
        if (!cancelled) setMyPermission('Read');
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  const {
    annotations,
    rootIds,
    byId,
    childrenByParent,
    refetch: refetchAnnotations,
    create: createAnnotation,
    update: updateAnnotationRaw,
    remove: removeAnnotation,
    updateBoundingBox,
    reparent,
  } = useAnnotations(pageId ?? null);

  const {
    captions,
    refetch: refetchCaptions,
    create: createCaption,
    rename: renameCaption,
    remove: deleteCaption,
  } = useCaptions(documentId ?? null);

  // Captions list (and its document-wide usageCount) is owned by the server.
  // Refetch whenever the page's annotation set changes so auto-created captions
  // (depth ≥ 3) and updated counts show up immediately.
  useEffect(() => {
    refetchCaptions();
  }, [annotations.length, refetchCaptions]);

  // Keep a ref to the latest annotations for snapshot-based undo/redo.
  const annotationsRef = useRef<Annotation[]>(annotations);
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);

  // Id remap for re-created annotations across undo/redo.
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
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showProcessed, setShowProcessed] = useState(true);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());

  // Preprocessing
  const [isPreprocessOpen, setIsPreprocessOpen] = useState(false);
  const [preprocessOps, setPreprocessOps] = useState<PreprocessOperation[]>([]);
  const [isSavingPreprocess, setIsSavingPreprocess] = useState(false);
  const [isResettingPreprocess, setIsResettingPreprocess] = useState(false);
  const [isPreprocessHistoryBusy, setIsPreprocessHistoryBusy] = useState(false);
  const [preprocessHistory, setPreprocessHistory] = useState<PreprocessHistoryEntry[]>([]);
  const [applyAllPrompt, setApplyAllPrompt] = useState<{
    ops: { name: string; value?: number }[];
  } | null>(null);
  const [isApplyingToAll, setIsApplyingToAll] = useState(false);
  const [isAutoAnnotating, setIsAutoAnnotating] = useState(false);

  const handleAutoAnnotate = useCallback(async () => {
    if (!pageId || isAutoAnnotating) return;
    try {
      setIsAutoAnnotating(true);
      const created = await annotationService.autoAnnotate(pageId);
      await Promise.all([refetchAnnotations(), refetchCaptions()]);
      if (created.length === 0) {
        toast('No detections found on this page.', { icon: 'ℹ️' });
      } else {
        toast.success(`Auto-annotated ${created.length} region${created.length === 1 ? '' : 's'}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Auto-annotation failed';
      toast.error(message);
    } finally {
      setIsAutoAnnotating(false);
    }
  }, [pageId, isAutoAnnotating, refetchAnnotations, refetchCaptions]);

  const fetchPreprocessHistory = useCallback(async () => {
    if (!documentId || !pageId) return;
    try {
      const state = await pageService.getPreprocessHistory(documentId, pageId);
      setPreprocessHistory(state.entries);
    } catch {
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

  // Keep selectedAnnotation reference in sync with the latest annotations array.
  useEffect(() => {
    setSelectedAnnotation((prev) => {
      if (!prev) return prev;
      const fresh = byId.get(prev.id);
      if (!fresh) return null;
      return fresh === prev ? prev : fresh;
    });
  }, [byId]);

  // Effective locks propagate from ancestors to descendants via parentId.
  const effectivelyLockedIds = React.useMemo(() => {
    const locked = new Set<string>();
    for (const a of annotations) {
      // Walk up parent chain; if any ancestor (including self) is in lockedIds, mark.
      let cur: string | null = a.id;
      const visited = new Set<string>();
      while (cur && !visited.has(cur)) {
        visited.add(cur);
        if (lockedIds.has(cur)) {
          locked.add(a.id);
          break;
        }
        cur = byId.get(cur)?.parentId ?? null;
      }
    }
    return locked;
  }, [annotations, byId, lockedIds]);

  const toggleLock = useCallback((id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // History (undo/redo)
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

  // Selection
  const handleSelectAnnotation = useCallback(
    (ann: Annotation | null, additive = false) => {
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
            const fresh = nextPrimary ? byId.get(nextPrimary) ?? null : null;
            setSelectedAnnotation(fresh);
          }
        } else {
          next.add(ann.id);
          setSelectedAnnotation(ann);
        }
        return next;
      });
    },
    [selectedAnnotation, byId]
  );

  // Tree-panel select takes (id, opts) — wrap.
  const handleSelectFromTree = useCallback(
    (id: string, opts?: { toggle?: boolean }) => {
      const ann = byId.get(id);
      if (!ann) return;
      handleSelectAnnotation(ann, opts?.toggle ?? false);
    },
    [byId, handleSelectAnnotation]
  );

  // Fetch page on mount/page change
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
      const pages = await pageService.getPages(documentId);
      setPageCount(pages.length);
      setPageList(pages);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load page';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Snapshot helper for re-creating an annotation (excluding cascaded descendants).
  const snapshotForRecreate = useCallback(
    (a: Annotation): CreateAnnotationData => ({
      parentId: a.parentId,
      captionId: a.captionId,
      type: a.type,
      content: a.content,
      transcription: a.transcription,
      transcriptionRefId: a.transcriptionRefId ?? null,
      orientation: a.orientation,
      boundingBox: a.boundingBox,
    }),
    []
  );

  // Tracked delete with undo (restores subtree).
  const trackedDelete = useCallback(async (id: string) => {
    const realId = resolveId(id);
    const target = annotationsRef.current.find((a) => a.id === realId);
    if (!target) return;

    // Capture subtree (depth-first). Children must be recreated after parents on undo.
    const collectSubtree = (rootId: string): Annotation[] => {
      const out: Annotation[] = [];
      const stack = [rootId];
      while (stack.length) {
        const cur = stack.pop()!;
        const a = annotationsRef.current.find((x) => x.id === cur);
        if (!a) continue;
        out.push(a);
        for (const child of annotationsRef.current.filter((c) => c.parentId === cur)) {
          stack.push(child.id);
        }
      }
      return out;
    };
    const subtree = collectSubtree(realId);

    await removeAnnotation(realId);

    pushCommand({
      undo: async () => {
        // Recreate from root downward so parentIds resolve.
        const newIdByOld = new Map<string, string>();
        // Sort by depth so parents come first.
        const depth = (a: Annotation): number => {
          let d = 0;
          let cur: string | null = a.parentId;
          while (cur) {
            d++;
            cur = annotationsRef.current.find((x) => x.id === cur)?.parentId ?? null;
          }
          return d;
        };
        const ordered = [...subtree].sort((a, b) => depth(a) - depth(b));
        for (const a of ordered) {
          const data = snapshotForRecreate(a);
          if (a.parentId && newIdByOld.has(a.parentId)) {
            data.parentId = newIdByOld.get(a.parentId)!;
          } else if (a.parentId) {
            data.parentId = resolveId(a.parentId);
          }
          const created = await createAnnotation(data);
          newIdByOld.set(a.id, created.id);
          remapId(a.id, created.id);
        }
      },
      redo: async () => {
        await removeAnnotation(resolveId(realId));
      },
    });
  }, [createAnnotation, removeAnnotation, pushCommand, resolveId, remapId, snapshotForRecreate]);

  // Multi-delete (Backspace / Delete). Backend cascades, so when an ancestor
  // is also selected we skip its descendants.
  const handleDeleteSelected = useCallback(async () => {
    if (!pageId || selectedIds.size === 0) return;
    const selected = Array.from(selectedIds)
      .map((id) => byId.get(id))
      .filter((a): a is Annotation => !!a);
    if (selected.length === 0) return;

    const selectedSet = new Set(selected.map((a) => a.id));
    const filtered = selected.filter((a) => {
      let cur: string | null = a.parentId;
      while (cur) {
        if (selectedSet.has(cur)) return false;
        cur = byId.get(cur)?.parentId ?? null;
      }
      return true;
    });

    try {
      await runInBatch(async () => {
        for (const a of filtered) await trackedDelete(a.id);
      });
      toast.success(
        selected.length === 1
          ? 'Annotation deleted'
          : `Deleted ${selected.length} annotations`
      );
      setSelectedAnnotation(null);
      setSelectedIds(new Set());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete annotation';
      toast.error(message);
    }
  }, [pageId, selectedIds, byId, trackedDelete, runInBatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (readOnly) return;
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
  }, [handleDeleteSelected, readOnly]);

  const handlePrevPage = () => {
    if (!page || !documentId) return;
    const prev = pageList.find((p) => p.pageNumber === page.pageNumber - 1);
    if (prev) navigate(`/documents/${documentId}/annotate/${prev.id}`);
  };

  const handleNextPage = () => {
    if (!page || !documentId) return;
    const next = pageList.find((p) => p.pageNumber === page.pageNumber + 1);
    if (next) navigate(`/documents/${documentId}/annotate/${next.id}`);
  };

  // ---------------------------------------------------------------------------
  // Unified create flow — single 'annotation' tool branch.
  // Geometric containment: deepest container becomes parent.
  // ---------------------------------------------------------------------------
  const handleCreateFromBox = useCallback(
    async (box: BoundingBox): Promise<Annotation | null> => {
      if (!pageId) return null;
      try {
        const parent = findDeepestContainer(annotationsRef.current, box);
        const created = await createAnnotation({
          parentId: parent?.id ?? null,
          type: 'Text',
          orientation: 0,
          boundingBox: box,
        });
        const originalId = created.id;
        pushCommand({
          undo: async () => {
            await removeAnnotation(resolveId(originalId));
          },
          redo: async () => {
            // Recompute parent against current state — original `parent`
            // may have been deleted between undo and redo.
            const liveParent = findDeepestContainer(annotationsRef.current, box);
            const recreated = await createAnnotation({
              parentId: liveParent?.id ?? null,
              type: 'Text',
              orientation: 0,
              boundingBox: box,
            });
            remapId(originalId, recreated.id);
          },
        });
        toast.success('Annotation created');
        return created;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create annotation';
        toast.error(message);
        return null;
      }
    },
    [pageId, createAnnotation, removeAnnotation, pushCommand, resolveId, remapId]
  );

  // Drag-end: update box, then reparent based on geometric containment.
  const handleDragEndAnnotation = useCallback(
    async (id: string, newBox: BoundingBox) => {
      const realId = resolveId(id);
      const current = annotationsRef.current.find((a) => a.id === realId);
      if (!current) return;
      const oldBox = current.boundingBox;
      const oldParentId = current.parentId;

      try {
        await updateBoundingBox(realId, newBox);

        const candidates = annotationsRef.current.filter(
          (a) => a.id !== realId && !isDescendantOf(annotationsRef.current, a.id, realId)
        );
        const newParent = findDeepestContainer(candidates, newBox);
        const newParentId = newParent?.id ?? null;
        const reparented = newParentId !== oldParentId;
        if (reparented) {
          await reparent(realId, newParentId);
        }

        pushCommand({
          undo: async () => {
            await updateBoundingBox(resolveId(realId), oldBox);
            if (reparented) {
              await reparent(resolveId(realId), oldParentId ? resolveId(oldParentId) : null);
            }
          },
          redo: async () => {
            await updateBoundingBox(resolveId(realId), newBox);
            if (reparented) {
              await reparent(resolveId(realId), newParentId ? resolveId(newParentId) : null);
            }
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update annotation';
        toast.error(message);
      }
    },
    [updateBoundingBox, reparent, pushCommand, resolveId]
  );

  // Multi-move: same delta applied to each item; reparent each.
  const handleMultiBoundingBoxUpdated = useCallback(
    async (updates: Array<{ id: string; box: BoundingBox }>) => {
      if (updates.length === 0) return;
      // Resolve real ids and compute the projected post-move snapshot ONCE,
      // so each item's reparent decision sees the final state of the others
      // (not the stale pre-move boxes).
      const resolved = updates.map((u) => ({ realId: resolveId(u.id), box: u.box }));
      const movedIds = new Set(resolved.map((r) => r.realId));
      const projected = annotationsRef.current.map((a) => {
        const m = resolved.find((r) => r.realId === a.id);
        return m ? { ...a, boundingBox: m.box } : a;
      });
      void movedIds;
      await runInBatch(async () => {
        for (const r of resolved) {
          // Exclude self and any descendant of the item being placed.
          const safeCandidates = projected.filter(
            (a) => a.id !== r.realId && !isDescendantOf(projected, a.id, r.realId)
          );
          const newParent = findDeepestContainer(safeCandidates, r.box);
          const newParentId = newParent?.id ?? null;
          const current = annotationsRef.current.find((a) => a.id === r.realId);
          const oldBox = current?.boundingBox;
          const oldParentId = current?.parentId ?? null;
          await updateBoundingBox(r.realId, r.box);
          const reparented = newParentId !== oldParentId;
          if (reparented) {
            await reparent(r.realId, newParentId);
          }
          if (oldBox) {
            pushCommand({
              undo: async () => {
                await updateBoundingBox(resolveId(r.realId), oldBox);
                if (reparented) {
                  await reparent(
                    resolveId(r.realId),
                    oldParentId ? resolveId(oldParentId) : null
                  );
                }
              },
              redo: async () => {
                await updateBoundingBox(resolveId(r.realId), r.box);
                if (reparented) {
                  await reparent(
                    resolveId(r.realId),
                    newParentId ? resolveId(newParentId) : null
                  );
                }
              },
            });
          }
        }
      });
    },
    [resolveId, runInBatch, updateBoundingBox, reparent, pushCommand]
  );

  // Properties-panel update wrapper — also undoable.
  const handleUpdateAnnotation = useCallback(
    async (id: string, data: Partial<Omit<Annotation, 'id'>>) => {
      const realId = resolveId(id);
      const before = annotationsRef.current.find((a) => a.id === realId);
      if (!before) return;
      const beforeData: UpdateAnnotationData = {
        captionId: before.captionId,
        type: before.type,
        content: before.content,
        transcription: before.transcription,
        transcriptionRefId: before.transcriptionRefId ?? null,
        orientation: before.orientation,
        boundingBox: before.boundingBox,
      };
      // Strip parentId/etc not allowed in PropertiesPanel payload — pass-through everything else.
      const afterData: UpdateAnnotationData = { ...data } as UpdateAnnotationData;
      try {
        await updateAnnotationRaw(realId, afterData);
        pushCommand({
          undo: async () => {
            await updateAnnotationRaw(resolveId(realId), beforeData);
          },
          redo: async () => {
            await updateAnnotationRaw(resolveId(realId), afterData);
          },
        });
        setLivePreview(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update annotation';
        toast.error(message);
        throw error;
      }
    },
    [updateAnnotationRaw, pushCommand, resolveId]
  );

  // Caption mutations: thin wrappers returning void (CaptionsPanel expects Promise<void>).
  const handleAddCaption = useCallback(
    async (name: string) => {
      try {
        await createCaption(name);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to add caption';
        toast.error(message);
        throw error;
      }
    },
    [createCaption]
  );
  const handleRenameCaption = useCallback(
    async (id: string, name: string) => {
      try {
        await renameCaption(id, name);
        await refetchAnnotations();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to rename caption';
        toast.error(message);
        throw error;
      }
    },
    [renameCaption, refetchAnnotations]
  );
  const handleDeleteCaption = useCallback(
    async (id: string) => {
      try {
        await deleteCaption(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete caption';
        toast.error(message);
        throw error;
      }
    },
    [deleteCaption]
  );

  // Single-id delete from tree
  const handleDeleteFromTree = useCallback(
    (id: string) => {
      void runInBatch(async () => { await trackedDelete(id); });
    },
    [trackedDelete, runInBatch]
  );

  const handleZoomChange = (newZoom: number) => setZoom(newZoom);

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
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  useEffect(() => {
    setHistory([]);
    setHistoryIndex(-1);
    idMap.current.clear();
  }, [pageId]);

  if (isLoading) return <LoadingSpinner />;
  if (!page) return <div className="text-center py-12 text-ink-900/60 font-serif italic text-lg">Page not found</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-parchment-100">
      <div data-tour="annotation-toolbar">
      <Toolbar
        currentTool={readOnly ? 'select' : currentTool}
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
        onAutoAnnotate={handleAutoAnnotate}
        isAutoAnnotating={isAutoAnnotating}
        readOnly={readOnly}
      />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: Annotation tree */}
        <div className="w-80 border-r border-sepia-600/20 bg-parchment-50 overflow-y-auto">
          <AnnotationTreePanel
            rootIds={rootIds}
            byId={byId}
            childrenByParent={childrenByParent}
            selectedIds={selectedIds}
            onSelect={handleSelectFromTree}
            onDelete={handleDeleteFromTree}
            lockedIds={lockedIds}
            effectivelyLockedIds={effectivelyLockedIds}
            onToggleLock={toggleLock}
            readOnly={readOnly}
          />
        </div>

        {/* Center: canvas */}
        <div data-tour="annotation-canvas" className="flex-1 bg-parchment-200/50 overflow-hidden">
          {page && (
            <AnnotationCanvas
              page={page}
              annotations={annotations}
              captions={captions}
              currentTool={readOnly ? 'select' : currentTool}
              zoom={zoom}
              selectedAnnotation={selectedAnnotation}
              selectedIds={selectedIds}
              onCreateFromBox={handleCreateFromBox}
              onAnnotationSelected={(ann, additive) => {
                handleSelectAnnotation(ann, additive);
                setLivePreview(null);
              }}
              onDragEndAnnotation={handleDragEndAnnotation}
              onMultiBoundingBoxUpdated={handleMultiBoundingBoxUpdated}
              showProcessed={showProcessed}
              livePreview={livePreview}
              lockedIds={effectivelyLockedIds}
              previewOps={isPreprocessOpen ? preprocessOps : undefined}
              annotationsDisabled={isPreprocessOpen}
              readOnly={readOnly}
            />
          )}
        </div>

        {/* Right sidebar: Captions + Properties (or Preprocess panel) */}
        <div data-tour="annotation-side-panel" className="w-72 border-l border-sepia-600/20 bg-parchment-50 overflow-y-auto flex flex-col">
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
            <>
              <CaptionsPanel
                captions={captions}
                annotations={annotations}
                onAdd={handleAddCaption}
                onRename={handleRenameCaption}
                onDelete={handleDeleteCaption}
                onSelectByCaption={(captionId) => {
                  const ids = annotations.filter((a) => a.captionId === captionId).map((a) => a.id);
                  setSelectedIds(new Set(ids));
                }}
                readOnly={readOnly}
              />
              <PropertiesPanel
                annotation={selectedAnnotation}
                captions={captions}
                documentId={documentId || ''}
                onUpdate={handleUpdateAnnotation}
                onDelete={handleDeleteFromTree}
                readOnly={readOnly}
              />
            </>
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
