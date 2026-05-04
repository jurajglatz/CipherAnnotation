/**
 * Unified annotation state for a single page.
 * Holds a flat list keyed by id and exposes a memoised parent->children index
 * so consumers can render trees without owning their own state shape.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Annotation, BoundingBox } from '../types';
import annotationService, {
  CreateAnnotationData,
  UpdateAnnotationData,
} from '../services/annotationService';

export interface UseAnnotationsResult {
  annotations: Annotation[];
  rootIds: string[];
  childrenByParent: Map<string | null, Annotation[]>;
  byId: Map<string, Annotation>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (data: CreateAnnotationData) => Promise<Annotation>;
  update: (id: string, data: UpdateAnnotationData) => Promise<Annotation>;
  remove: (id: string) => Promise<void>;
  updateBoundingBox: (id: string, box: BoundingBox) => Promise<void>;
  reparent: (id: string, newParentId: string | null) => Promise<void>;
}

export function useAnnotations(pageId: string | null): UseAnnotationsResult {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!pageId) {
      setAnnotations([]);
      return;
    }
    setLoading(true);
    try {
      const list = await annotationService.list(pageId);
      setAnnotations(list);
      setError(null);
    } catch (e) {
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const { byId, rootIds, childrenByParent } = useMemo(() => {
    const byIdLocal = new Map<string, Annotation>();
    const childrenByParentLocal = new Map<string | null, Annotation[]>();
    for (const a of annotations) byIdLocal.set(a.id, a);
    const sorted = [...annotations].sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
    for (const a of sorted) {
      const key = a.parentId ?? null;
      const list = childrenByParentLocal.get(key) ?? [];
      list.push(a);
      childrenByParentLocal.set(key, list);
    }
    const roots = (childrenByParentLocal.get(null) ?? []).map((a) => a.id);
    return {
      byId: byIdLocal,
      rootIds: roots,
      childrenByParent: childrenByParentLocal,
    };
  }, [annotations]);

  const create = useCallback(
    async (data: CreateAnnotationData) => {
      if (!pageId) throw new Error('No page selected.');
      const created = await annotationService.create(pageId, data);
      // Refetch so server-computed captionNumber and any new caption rows are reflected.
      await refetch();
      return created;
    },
    [pageId, refetch],
  );

  const update = useCallback(
    async (id: string, data: UpdateAnnotationData) => {
      if (!pageId) throw new Error('No page selected.');
      const updated = await annotationService.update(pageId, id, data);
      setAnnotations((prev) => prev.map((a) => (a.id === id ? updated : a)));
      // Caption / parent / type changes can shift numbers across the page — refetch.
      if (
        data.captionId !== undefined ||
        data.parentId !== undefined ||
        data.type !== undefined
      ) {
        await refetch();
      }
      return updated;
    },
    [pageId, refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!pageId) throw new Error('No page selected.');
      await annotationService.remove(pageId, id);
      // Server cascades descendants and renumbers — refetch.
      await refetch();
    },
    [pageId, refetch],
  );

  const updateBoundingBox = useCallback(
    async (id: string, box: BoundingBox) => {
      if (!pageId) throw new Error('No page selected.');
      await annotationService.updateBoundingBox(pageId, id, box);
      setAnnotations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, boundingBox: box } : a)),
      );
    },
    [pageId],
  );

  const reparent = useCallback(
    async (id: string, newParentId: string | null) => {
      await update(id, { parentId: newParentId });
    },
    [update],
  );

  return {
    annotations,
    rootIds,
    childrenByParent,
    byId,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
    updateBoundingBox,
    reparent,
  };
}

function extractMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const data = (e as { response?: { data?: { message?: string } } }).response
      ?.data;
    if (data?.message) return data.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
