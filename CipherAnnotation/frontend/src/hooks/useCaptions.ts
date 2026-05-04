/**
 * Loads and mutates the document's captions, including page-scoped usage counts
 * (which are derived client-side from page annotations).
 */

import { useCallback, useEffect, useState } from 'react';
import { Caption } from '../types';
import captionService from '../services/captionService';

export interface UseCaptionsResult {
  captions: Caption[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (name: string) => Promise<Caption>;
  rename: (id: string, name: string) => Promise<Caption>;
  remove: (id: string) => Promise<void>;
}

export function useCaptions(documentId: string | null): UseCaptionsResult {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!documentId) {
      setCaptions([]);
      return;
    }
    setLoading(true);
    try {
      setCaptions(await captionService.list(documentId));
      setError(null);
    } catch (e) {
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (name: string) => {
      if (!documentId) throw new Error('No document.');
      const c = await captionService.create(documentId, name);
      setCaptions((prev) => [...prev, c]);
      return c;
    },
    [documentId],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      if (!documentId) throw new Error('No document.');
      const c = await captionService.rename(documentId, id, name);
      setCaptions((prev) => prev.map((x) => (x.id === id ? c : x)));
      return c;
    },
    [documentId],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!documentId) throw new Error('No document.');
      await captionService.remove(documentId, id);
      setCaptions((prev) => prev.filter((x) => x.id !== id));
    },
    [documentId],
  );

  return { captions, loading, error, refetch, create, rename, remove };
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
