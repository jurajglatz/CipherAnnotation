import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../services/documentService', () => ({
  default: {
    getMyDocuments: vi.fn(),
    getPublicDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getDocument: vi.fn(),
  },
}));

import { useDocuments } from './useDocuments';
import documentService from '../services/documentService';
import type { Document } from '../types';

const mocked = documentService as unknown as Record<string, ReturnType<typeof vi.fn>>;

const doc = (id: string, title = 'D'): Document => ({ id, title } as unknown as Document);

describe('useDocuments', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not auto-load on mount', () => {
    const { result } = renderHook(() => useDocuments());
    expect(result.current.documents).toEqual([]);
    expect(mocked.getMyDocuments).not.toHaveBeenCalled();
    expect(mocked.getPublicDocuments).not.toHaveBeenCalled();
  });

  it('fetchDocuments("my") populates state', async () => {
    mocked.getMyDocuments.mockResolvedValue([doc('1'), doc('2')]);
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.fetchDocuments('my');
    });

    expect(result.current.documents.map((d) => d.id)).toEqual(['1', '2']);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetchDocuments("public") uses the public endpoint', async () => {
    mocked.getPublicDocuments.mockResolvedValue([doc('p1')]);
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      await result.current.fetchDocuments('public');
    });

    expect(mocked.getPublicDocuments).toHaveBeenCalled();
    expect(mocked.getMyDocuments).not.toHaveBeenCalled();
  });

  it('createDocument prepends and returns the new document', async () => {
    mocked.getMyDocuments.mockResolvedValue([doc('1')]);
    mocked.createDocument.mockResolvedValue(doc('new'));

    const { result } = renderHook(() => useDocuments());
    await act(async () => { await result.current.fetchDocuments('my'); });

    let created!: Document;
    await act(async () => {
      created = await result.current.createDocument(new FormData());
    });

    expect(created.id).toBe('new');
    expect(result.current.documents.map((d) => d.id)).toEqual(['new', '1']);
  });

  it('updateDocument replaces the existing entry', async () => {
    mocked.getMyDocuments.mockResolvedValue([doc('1', 'old'), doc('2')]);
    mocked.updateDocument.mockResolvedValue(doc('1', 'new'));

    const { result } = renderHook(() => useDocuments());
    await act(async () => { await result.current.fetchDocuments('my'); });
    await act(async () => { await result.current.updateDocument('1', { title: 'new' }); });

    expect(result.current.documents.find((d) => d.id === '1')?.title).toBe('new');
  });

  it('deleteDocument removes the entry', async () => {
    mocked.getMyDocuments.mockResolvedValue([doc('1'), doc('2')]);
    mocked.deleteDocument.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDocuments());
    await act(async () => { await result.current.fetchDocuments('my'); });
    await act(async () => { await result.current.deleteDocument('1'); });

    expect(result.current.documents.map((d) => d.id)).toEqual(['2']);
  });

  it('error path sets error and rethrows', async () => {
    mocked.getMyDocuments.mockRejectedValue(new Error('nope'));
    const { result } = renderHook(() => useDocuments());

    let thrown: unknown;
    await act(async () => {
      try { await result.current.fetchDocuments('my'); }
      catch (e) { thrown = e; }
    });

    expect((thrown as Error).message).toBe('nope');
    expect(result.current.error).toBe('nope');
    expect(result.current.loading).toBe(false);
  });

  it('clearError() resets error state', async () => {
    mocked.getMyDocuments.mockRejectedValue(new Error('x'));
    const { result } = renderHook(() => useDocuments());

    await act(async () => {
      try { await result.current.fetchDocuments('my'); }
      catch { /* expected */ }
    });
    expect(result.current.error).toBe('x');

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});
