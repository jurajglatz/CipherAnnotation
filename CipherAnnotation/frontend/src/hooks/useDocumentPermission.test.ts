import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/services', () => ({
  documentService: {
    getDocument: vi.fn(),
  },
}));

import { useDocumentPermission } from './useDocumentPermission';
import { documentService } from '@/services';

const ds = documentService as unknown as { getDocument: ReturnType<typeof vi.fn> };

describe('useDocumentPermission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults to Read when documentId is undefined and does not fetch', async () => {
    const { result } = renderHook(() => useDocumentPermission(undefined));
    expect(result.current.myPermission).toBe('Read');
    expect(result.current.canEdit).toBe(false);
    expect(result.current.readOnly).toBe(true);
    expect(ds.getDocument).not.toHaveBeenCalled();
  });

  it('Owner permission yields canEdit=true', async () => {
    ds.getDocument.mockResolvedValue({ myPermission: 'Owner' });
    const { result } = renderHook(() => useDocumentPermission('d1'));
    await waitFor(() => expect(result.current.myPermission).toBe('Owner'));
    expect(result.current.canEdit).toBe(true);
    expect(result.current.readOnly).toBe(false);
  });

  it('Edit permission yields canEdit=true', async () => {
    ds.getDocument.mockResolvedValue({ myPermission: 'Edit' });
    const { result } = renderHook(() => useDocumentPermission('d1'));
    await waitFor(() => expect(result.current.canEdit).toBe(true));
  });

  it('Read permission yields canEdit=false', async () => {
    ds.getDocument.mockResolvedValue({ myPermission: 'Read' });
    const { result } = renderHook(() => useDocumentPermission('d1'));
    await waitFor(() => expect(ds.getDocument).toHaveBeenCalled());
    expect(result.current.canEdit).toBe(false);
  });

  it('falls back to Read on fetch failure', async () => {
    ds.getDocument.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDocumentPermission('d1'));
    await waitFor(() => expect(ds.getDocument).toHaveBeenCalled());
    expect(result.current.myPermission).toBe('Read');
    expect(result.current.readOnly).toBe(true);
  });
});
