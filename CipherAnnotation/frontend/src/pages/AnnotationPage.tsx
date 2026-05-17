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
  MultiSelectPropertiesPanel,
  Toolbar,
  PreprocessPanel,
} from '@/components/annotation';
import { findDeepestContainer, isDescendantOf, overlapRatio } from '@/components/annotation/utils/geometry';
import { pageService, annotationService } from '@/services';
import {
  useAnnotations,
  useCaptions,
  useTour,
  useAnnotationHistory,
  usePreprocess,
  useAnnotationKeyboardShortcuts,
  useDocumentPermission,
} from '@/hooks';
import { Page, Annotation, BoundingBox } from '@/types';
import { CreateAnnotationData, UpdateAnnotationData } from '@/services/annotationService';

type ToolType = 'select' | 'annotation' | 'multiselect';

export const AnnotationPage: React.FC = () => {
  const { documentId, pageId } = useParams<{ documentId: string; pageId: string }>();
  const navigate = useNavigate();
  useTour('annotation');

  const { readOnly } = useDocumentPermission(documentId);

  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [pageList, setPageList] = useState<Page[]>([]);

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

  const {
    canUndo,
    canRedo,
    pushCommand,
    runInBatch,
    handleUndo: rawHandleUndo,
    handleRedo: rawHandleRedo,
    resolveId,
    remapId,
  } = useAnnotationHistory(pageId);

  // UI state
  const [currentTool, setCurrentTool] = useState<ToolType>('select');
  const [zoom, setZoom] = useState(100);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showProcessed, setShowProcessed] = useState(true);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());
  const [hiddenCaptionIds, setHiddenCaptionIds] = useState<Set<string>>(new Set());
  const [livePreview, setLivePreview] = useState<{
    id: string;
    orientation?: number;
    boundingBox?: BoundingBox;
  } | null>(null);
  const [isAutoAnnotating, setIsAutoAnnotating] = useState(false);
  const [autoAnnotateAllPrompt, setAutoAnnotateAllPrompt] = useState(false);
  const [isAutoAnnotatingAll, setIsAutoAnnotatingAll] = useState(false);

  const fetchPageData = useCallback(async () => {
    if (!pageId || !documentId) return;
    try {
      setIsLoading(true);
      const pageData = await pageService.getPage(documentId, pageId);
      setPage(pageData);
      const pages = await pageService.getPages(documentId);
      setPageCount(pages.length);
      setPageList(pages);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load page');
    } finally {
      setIsLoading(false);
    }
  }, [pageId, documentId]);

  const preprocess = usePreprocess({
    documentId,
    pageId,
    pageCount: pageList.length,
    onPageRefetch: fetchPageData,
  });

  const handleTogglePreprocess = () => {
    if (preprocess.isOpen) {
      preprocess.close();
    } else {
      preprocess.open();
      setSelectedAnnotation(null);
      setSelectedIds(new Set());
      setCurrentTool('select');
    }
  };

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
      if (pageList.length > 1) setAutoAnnotateAllPrompt(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Auto-annotation failed');
    } finally {
      setIsAutoAnnotating(false);
    }
  }, [pageId, isAutoAnnotating, refetchAnnotations, refetchCaptions, pageList.length]);

  const dismissAutoAnnotateAll = useCallback(() => {
    if (!isAutoAnnotatingAll) setAutoAnnotateAllPrompt(false);
  }, [isAutoAnnotatingAll]);

  const confirmAutoAnnotateAll = useCallback(async () => {
    if (!documentId || isAutoAnnotatingAll) return;
    setAutoAnnotateAllPrompt(false);
    try {
      setIsAutoAnnotatingAll(true);
      const result = await annotationService.autoAnnotateAll(documentId, {
        excludePageId: pageId ?? undefined,
      });
      await Promise.all([refetchAnnotations(), refetchCaptions()]);
      if (result.failedCount > 0) {
        toast.error(`Auto-annotated ${result.appliedCount} page(s), ${result.failedCount} failed`);
      } else {
        toast.success(
          `Auto-annotated ${result.appliedCount} page(s) (${result.totalCreated} region${result.totalCreated === 1 ? '' : 's'})`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Auto-annotate all pages failed');
    } finally {
      setIsAutoAnnotatingAll(false);
    }
  }, [documentId, pageId, isAutoAnnotatingAll, refetchAnnotations, refetchCaptions]);

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

  const toggleCaptionVisibility = useCallback((captionId: string) => {
    setHiddenCaptionIds((prev) => {
      const next = new Set(prev);
      if (next.has(captionId)) next.delete(captionId);
      else next.add(captionId);
      return next;
    });
  }, []);

  const visibleAnnotations = React.useMemo(
    () =>
      hiddenCaptionIds.size === 0
        ? annotations
        : annotations.filter((a) => !hiddenCaptionIds.has(a.captionId)),
    [annotations, hiddenCaptionIds]
  );

  // Tree structures filtered to visible captions. Children of hidden parents
  // are promoted to their nearest visible ancestor (or root) so they stay reachable.
  const { visibleRootIds, visibleById, visibleChildrenByParent } = React.useMemo(() => {
    if (hiddenCaptionIds.size === 0) {
      return {
        visibleRootIds: rootIds,
        visibleById: byId,
        visibleChildrenByParent: childrenByParent,
      };
    }
    const visibleByIdLocal = new Map<string, Annotation>();
    for (const a of visibleAnnotations) visibleByIdLocal.set(a.id, a);
    const nearestVisibleAncestor = (parentId: string | null): string | null => {
      let cur = parentId;
      while (cur !== null) {
        if (visibleByIdLocal.has(cur)) return cur;
        cur = byId.get(cur)?.parentId ?? null;
      }
      return null;
    };
    const childrenByParentLocal = new Map<string | null, Annotation[]>();
    for (const a of visibleAnnotations) {
      const key = nearestVisibleAncestor(a.parentId ?? null);
      const list = childrenByParentLocal.get(key) ?? [];
      list.push(a);
      childrenByParentLocal.set(key, list);
    }
    const roots = (childrenByParentLocal.get(null) ?? []).map((a) => a.id);
    return {
      visibleRootIds: roots,
      visibleById: visibleByIdLocal,
      visibleChildrenByParent: childrenByParentLocal,
    };
  }, [visibleAnnotations, hiddenCaptionIds, rootIds, byId, childrenByParent]);

  const toggleLock = useCallback((id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
      preprocess.fetchHistory();
    }
    // preprocess.fetchHistory is stable per ids; fetchPageData is stable.
  }, [pageId, documentId, fetchPageData, preprocess.fetchHistory]);

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
        const newIdByOld = new Map<string, string>();
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
      toast.error(error instanceof Error ? error.message : 'Failed to delete annotation');
    }
  }, [pageId, selectedIds, byId, trackedDelete, runInBatch]);

  // Undo/redo wrappers that also clear selection (matches pre-refactor behavior).
  const handleUndo = useCallback(async () => {
    await rawHandleUndo();
    setSelectedAnnotation(null);
  }, [rawHandleUndo]);

  const handleRedo = useCallback(async () => {
    await rawHandleRedo();
    setSelectedAnnotation(null);
  }, [rawHandleRedo]);

  useAnnotationKeyboardShortcuts({
    onDelete: handleDeleteSelected,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onEscape: () => {
      setSelectedAnnotation(null);
      setSelectedIds(new Set());
      setLivePreview(null);
    },
    readOnly,
  });

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

  // Unified create flow — geometric containment picks the parent.
  const handleCreateFromBox = useCallback(
    async (box: BoundingBox): Promise<Annotation | null> => {
      if (!pageId) return null;
      try {
        const parent = findDeepestContainer(annotationsRef.current, box);
        const created = await createAnnotation({
          parentId: parent?.id ?? null,
          type: 'Cipher',
          orientation: 0,
          boundingBox: box,
        });
        const originalId = created.id;
        pushCommand({
          undo: async () => {
            await removeAnnotation(resolveId(originalId));
          },
          redo: async () => {
            // Recompute parent — the original may have been deleted between undo and redo.
            const liveParent = findDeepestContainer(annotationsRef.current, box);
            const recreated = await createAnnotation({
              parentId: liveParent?.id ?? null,
              type: 'Cipher',
              orientation: 0,
              boundingBox: box,
            });
            remapId(originalId, recreated.id);
          },
        });
        toast.success('Annotation created');
        return created;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to create annotation');
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

        // A's children may no longer be geometrically contained by A after
        // it moved. Re-evaluate each direct child against the post-move
        // world and reparent any that A no longer contains.
        const projected = annotationsRef.current.map((a) =>
          a.id === realId ? { ...a, boundingBox: newBox, parentId: newParentId } : a
        );
        const directChildren = projected.filter((a) => a.parentId === realId);
        const childReparents: Array<{
          childId: string;
          oldParentId: string | null;
          newParentId: string | null;
        }> = [];
        for (const child of directChildren) {
          const childCandidates = projected.filter(
            (a) => a.id !== child.id && !isDescendantOf(projected, a.id, child.id)
          );
          const childNewParent = findDeepestContainer(childCandidates, child.boundingBox);
          const childNewParentId = childNewParent?.id ?? null;
          if (childNewParentId !== realId) {
            await reparent(child.id, childNewParentId);
            childReparents.push({
              childId: child.id,
              oldParentId: realId,
              newParentId: childNewParentId,
            });
          }
        }

        pushCommand({
          undo: async () => {
            await updateBoundingBox(resolveId(realId), oldBox);
            if (reparented) {
              await reparent(resolveId(realId), oldParentId ? resolveId(oldParentId) : null);
            }
            for (const cr of childReparents) {
              await reparent(
                resolveId(cr.childId),
                cr.oldParentId ? resolveId(cr.oldParentId) : null,
              );
            }
          },
          redo: async () => {
            await updateBoundingBox(resolveId(realId), newBox);
            if (reparented) {
              await reparent(resolveId(realId), newParentId ? resolveId(newParentId) : null);
            }
            for (const cr of childReparents) {
              await reparent(
                resolveId(cr.childId),
                cr.newParentId ? resolveId(cr.newParentId) : null,
              );
            }
          },
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update annotation');
      }
    },
    [updateBoundingBox, reparent, pushCommand, resolveId]
  );

  // Multi-move: same delta applied to each item; reparent each.
  // Each item's reparent decision sees the *projected* post-move state of all
  // moved items, not their stale pre-move boxes.
  const handleMultiBoundingBoxUpdated = useCallback(
    async (updates: Array<{ id: string; box: BoundingBox }>) => {
      if (updates.length === 0) return;
      const resolved = updates.map((u) => ({ realId: resolveId(u.id), box: u.box }));
      const projected = annotationsRef.current.map((a) => {
        const m = resolved.find((r) => r.realId === a.id);
        return m ? { ...a, boundingBox: m.box } : a;
      });
      const movedIds = new Set(resolved.map((r) => r.realId));
      await runInBatch(async () => {
        for (const r of resolved) {
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

          // Reparent non-moved direct children that this annotation no
          // longer geometrically contains.
          const directChildren = projected.filter(
            (a) => a.parentId === r.realId && !movedIds.has(a.id)
          );
          const childReparents: Array<{
            childId: string;
            oldParentId: string | null;
            newParentId: string | null;
          }> = [];
          for (const child of directChildren) {
            const childCandidates = projected.filter(
              (a) => a.id !== child.id && !isDescendantOf(projected, a.id, child.id)
            );
            const childNewParent = findDeepestContainer(childCandidates, child.boundingBox);
            const childNewParentId = childNewParent?.id ?? null;
            if (childNewParentId !== r.realId) {
              await reparent(child.id, childNewParentId);
              childReparents.push({
                childId: child.id,
                oldParentId: r.realId,
                newParentId: childNewParentId,
              });
            }
          }

          if (oldBox) {
            pushCommand({
              undo: async () => {
                await updateBoundingBox(resolveId(r.realId), oldBox);
                if (reparented) {
                  await reparent(resolveId(r.realId), oldParentId ? resolveId(oldParentId) : null);
                }
                for (const cr of childReparents) {
                  await reparent(
                    resolveId(cr.childId),
                    cr.oldParentId ? resolveId(cr.oldParentId) : null,
                  );
                }
              },
              redo: async () => {
                await updateBoundingBox(resolveId(r.realId), r.box);
                if (reparented) {
                  await reparent(resolveId(r.realId), newParentId ? resolveId(newParentId) : null);
                }
                for (const cr of childReparents) {
                  await reparent(
                    resolveId(cr.childId),
                    cr.newParentId ? resolveId(cr.newParentId) : null,
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

  // Marquee select: pick all visible annotations whose box lies (mostly) inside
  // the dragged rectangle, then switch back to the select/move tool.
  const handleMultiSelectFromBox = useCallback(
    (box: BoundingBox) => {
      const hits = visibleAnnotations.filter(
        (a) => overlapRatio(box, a.boundingBox) >= 0.9
      );
      if (hits.length === 0) {
        setSelectedAnnotation(null);
        setSelectedIds(new Set());
        setCurrentTool('select');
        toast('No annotations inside the selection', { icon: 'ℹ️' });
        return;
      }
      const ids = new Set(hits.map((a) => a.id));
      setSelectedIds(ids);
      setSelectedAnnotation(hits[0]);
      setCurrentTool('select');
    },
    [visibleAnnotations]
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
        toast.error(error instanceof Error ? error.message : 'Failed to update annotation');
        throw error;
      }
    },
    [updateAnnotationRaw, pushCommand, resolveId]
  );

  // Bulk caption reassignment for multi-selection. Each item gets an undo entry
  // inside a single batch, so one undo reverts them all.
  const handleBulkUpdateCaption = useCallback(
    async (ids: string[], captionId: string) => {
      if (ids.length === 0) return;
      try {
        await runInBatch(async () => {
          for (const id of ids) {
            const realId = resolveId(id);
            const before = annotationsRef.current.find((a) => a.id === realId);
            if (!before || before.captionId === captionId) continue;
            const beforeData: UpdateAnnotationData = {
              captionId: before.captionId,
              type: before.type,
              content: before.content,
              transcription: before.transcription,
              transcriptionRefId: before.transcriptionRefId ?? null,
              orientation: before.orientation,
              boundingBox: before.boundingBox,
            };
            const afterData: UpdateAnnotationData = { ...beforeData, captionId };
            await updateAnnotationRaw(realId, afterData);
            pushCommand({
              undo: async () => {
                await updateAnnotationRaw(resolveId(realId), beforeData);
              },
              redo: async () => {
                await updateAnnotationRaw(resolveId(realId), afterData);
              },
            });
          }
        });
        toast.success(`Caption applied to ${ids.length} annotations`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update annotations');
        throw error;
      }
    },
    [runInBatch, resolveId, updateAnnotationRaw, pushCommand]
  );

  // Bulk type reassignment for multi-selection. Same batch/undo shape as bulk caption.
  const handleBulkUpdateType = useCallback(
    async (ids: string[], type: Annotation['type']) => {
      if (ids.length === 0) return;
      try {
        await runInBatch(async () => {
          for (const id of ids) {
            const realId = resolveId(id);
            const before = annotationsRef.current.find((a) => a.id === realId);
            if (!before || before.type === type) continue;
            const beforeData: UpdateAnnotationData = {
              captionId: before.captionId,
              type: before.type,
              content: before.content,
              transcription: before.transcription,
              transcriptionRefId: before.transcriptionRefId ?? null,
              orientation: before.orientation,
              boundingBox: before.boundingBox,
            };
            const afterData: UpdateAnnotationData = { ...beforeData, type };
            await updateAnnotationRaw(realId, afterData);
            pushCommand({
              undo: async () => {
                await updateAnnotationRaw(resolveId(realId), beforeData);
              },
              redo: async () => {
                await updateAnnotationRaw(resolveId(realId), afterData);
              },
            });
          }
        });
        toast.success(`Type applied to ${ids.length} annotations`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update annotations');
        throw error;
      }
    },
    [runInBatch, resolveId, updateAnnotationRaw, pushCommand]
  );

  // Caption mutations: thin wrappers returning void (CaptionsPanel expects Promise<void>).
  const handleAddCaption = useCallback(
    async (name: string) => {
      try {
        await createCaption(name);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to add caption');
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
        toast.error(error instanceof Error ? error.message : 'Failed to rename caption');
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
        toast.error(error instanceof Error ? error.message : 'Failed to delete caption');
        throw error;
      }
    },
    [deleteCaption]
  );

  const handleDeleteFromTree = useCallback(
    (id: string) => {
      void runInBatch(async () => { await trackedDelete(id); });
    },
    [trackedDelete, runInBatch]
  );

  if (isLoading) return <LoadingSpinner />;
  if (!page) return <div className="text-center py-12 text-ink-900/60 font-serif italic text-lg">Page not found</div>;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-parchment-100">
      <div data-tour="annotation-toolbar">
        <Toolbar
          currentTool={readOnly ? 'select' : currentTool}
          zoom={zoom}
          onToolChange={setCurrentTool}
          onZoomChange={setZoom}
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
          isPreprocessOpen={preprocess.isOpen}
          onTogglePreprocess={handleTogglePreprocess}
          onAutoAnnotate={handleAutoAnnotate}
          isAutoAnnotating={isAutoAnnotating || isAutoAnnotatingAll}
          readOnly={readOnly}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-sepia-600/20 bg-parchment-50 overflow-y-auto">
          <AnnotationTreePanel
            rootIds={visibleRootIds}
            byId={visibleById}
            childrenByParent={visibleChildrenByParent}
            selectedIds={selectedIds}
            onSelect={handleSelectFromTree}
            onDelete={handleDeleteFromTree}
            lockedIds={lockedIds}
            effectivelyLockedIds={effectivelyLockedIds}
            onToggleLock={toggleLock}
            readOnly={readOnly}
          />
        </div>

        <div data-tour="annotation-canvas" className="flex-1 bg-parchment-200/50 overflow-hidden">
          <AnnotationCanvas
            page={page}
            annotations={visibleAnnotations}
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
            onMultiSelectFromBox={handleMultiSelectFromBox}
            showProcessed={showProcessed}
            livePreview={livePreview}
            lockedIds={effectivelyLockedIds}
            previewOps={preprocess.isOpen ? preprocess.ops : undefined}
            annotationsDisabled={preprocess.isOpen}
            readOnly={readOnly}
          />
        </div>

        <div data-tour="annotation-side-panel" className="w-72 border-l border-sepia-600/20 bg-parchment-50 overflow-y-auto flex flex-col">
          {preprocess.isOpen ? (
            <PreprocessPanel
              operations={preprocess.ops}
              onOperationsChange={preprocess.setOps}
              onSave={preprocess.save}
              onReset={preprocess.reset}
              onClose={preprocess.close}
              isSaving={preprocess.isSaving || preprocess.isApplyingToAll}
              isResetting={preprocess.isResetting}
              onUndo={preprocess.undo}
              onRedo={preprocess.redo}
              canUndo={Boolean(page.canUndoPreprocess)}
              canRedo={Boolean(page.canRedoPreprocess)}
              isHistoryBusy={preprocess.isHistoryBusy}
              history={preprocess.history}
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
                hiddenCaptionIds={hiddenCaptionIds}
                onToggleCaptionVisibility={toggleCaptionVisibility}
                readOnly={readOnly}
              />
              {selectedIds.size > 1 ? (
                <MultiSelectPropertiesPanel
                  annotations={Array.from(selectedIds)
                    .map((id) => byId.get(id))
                    .filter((a): a is Annotation => !!a)}
                  captions={captions}
                  onBulkUpdateCaption={handleBulkUpdateCaption}
                  onBulkUpdateType={handleBulkUpdateType}
                  readOnly={readOnly}
                />
              ) : (
                <PropertiesPanel
                  annotation={selectedAnnotation}
                  captions={captions}
                  documentId={documentId || ''}
                  onUpdate={handleUpdateAnnotation}
                  onDelete={handleDeleteFromTree}
                  readOnly={readOnly}
                />
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={autoAnnotateAllPrompt}
        onClose={dismissAutoAnnotateAll}
        onConfirm={confirmAutoAnnotateAll}
        title="Auto-annotate all pages?"
        message={`Run auto-annotation on the remaining ${pageList.length - 1} page${pageList.length - 1 === 1 ? '' : 's'} of this document? Detections will be added on top of each page's existing annotations.`}
        confirmText="All pages"
        cancelText="Only this page"
        isLoading={isAutoAnnotatingAll}
      />

      <ConfirmDialog
        isOpen={preprocess.applyAllPrompt !== null}
        onClose={preprocess.dismissApplyAll}
        onConfirm={preprocess.confirmApplyToAll}
        title="Apply to all pages?"
        message={`Apply these preprocess operations to every page of this document (${pageList.length} pages)? The operations will be chained on top of each page's current state, and each page will get its own undo history entry.`}
        confirmText="Apply to all pages"
        cancelText="Only this page"
        isLoading={preprocess.isApplyingToAll}
      />
    </div>
  );
};

export default AnnotationPage;
