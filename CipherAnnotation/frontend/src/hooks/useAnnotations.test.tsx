import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../services/annotationService', () => ({
  default: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    updateBoundingBox: vi.fn(),
  },
}));

import { useAnnotations } from './useAnnotations';
import annotationService from '../services/annotationService';
import type { Annotation, BoundingBox } from '../types';

const mocked = annotationService as unknown as {
  list: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  updateBoundingBox: ReturnType<typeof vi.fn>;
};

const bb: BoundingBox = { x: 0, y: 0, width: 10, height: 10 };

const a = (id: string, parentId: string | null = null, createdAt = '2026-01-01T00:00:00Z'): Annotation =>
  ({ id, parentId, boundingBox: bb, createdAt } as unknown as Annotation);

describe('useAnnotations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty list and does not call the service when pageId is null', async () => {
    const { result } = renderHook(() => useAnnotations(null));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.annotations).toEqual([]);
    expect(mocked.list).not.toHaveBeenCalled();
  });

  it('loads annotations on mount and builds parent/child index', async () => {
    mocked.list.mockResolvedValue([a('p'), a('c1', 'p'), a('c2', 'p')]);

    const { result } = renderHook(() => useAnnotations('page-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.annotations).toHaveLength(3);
    expect(result.current.rootIds).toEqual(['p']);
    expect(result.current.childrenByParent.get('p')?.map((x) => x.id)).toEqual(['c1', 'c2']);
    expect(result.current.byId.get('p')?.id).toBe('p');
  });

  it('sets error on load failure', async () => {
    mocked.list.mockRejectedValue({ response: { data: { message: 'boom' } } });

    const { result } = renderHook(() => useAnnotations('page-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('boom');
  });

  it('create() calls service and refetches', async () => {
    mocked.list.mockResolvedValue([a('a1')]);
    mocked.create.mockResolvedValue(a('a2'));

    const { result } = renderHook(() => useAnnotations('page-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocked.list.mockResolvedValue([a('a1'), a('a2')]);
    await act(async () => {
      await result.current.create({} as never);
    });

    expect(mocked.create).toHaveBeenCalledWith('page-1', {});
    expect(result.current.annotations.map((x) => x.id)).toEqual(['a1', 'a2']);
  });

  it('update() applies local change and refetches when captionId changes', async () => {
    mocked.list.mockResolvedValueOnce([a('a1')]);
    mocked.update.mockResolvedValue({ ...a('a1'), parentId: 'p' } as unknown as Annotation);

    const { result } = renderHook(() => useAnnotations('page-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocked.list.mockResolvedValueOnce([a('a1', 'p')]);
    await act(async () => {
      await result.current.update('a1', { captionId: 'cap-1' });
    });

    expect(mocked.update).toHaveBeenCalledWith('page-1', 'a1', { captionId: 'cap-1' });
    expect(mocked.list).toHaveBeenCalledTimes(2);
  });

  it('update() does NOT refetch when only non-structural fields change', async () => {
    mocked.list.mockResolvedValue([a('a1')]);
    mocked.update.mockResolvedValue(a('a1'));

    const { result } = renderHook(() => useAnnotations('page-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.update('a1', { content: 'X' });
    });

    expect(mocked.list).toHaveBeenCalledTimes(1);
  });

  it('remove() calls service and refetches', async () => {
    mocked.list.mockResolvedValueOnce([a('a1'), a('a2')]);
    mocked.remove.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAnnotations('page-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    mocked.list.mockResolvedValueOnce([a('a1')]);
    await act(async () => {
      await result.current.remove('a2');
    });

    expect(mocked.remove).toHaveBeenCalledWith('page-1', 'a2');
    expect(result.current.annotations.map((x) => x.id)).toEqual(['a1']);
  });

  it('updateBoundingBox applies optimistically without refetch', async () => {
    mocked.list.mockResolvedValue([a('a1')]);
    mocked.updateBoundingBox.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAnnotations('page-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newBox = { x: 5, y: 5, width: 1, height: 1 };
    await act(async () => {
      await result.current.updateBoundingBox('a1', newBox);
    });

    expect(mocked.updateBoundingBox).toHaveBeenCalledWith('page-1', 'a1', newBox);
    expect(result.current.byId.get('a1')?.boundingBox).toEqual(newBox);
    expect(mocked.list).toHaveBeenCalledTimes(1);
  });
});
