/**
 * useDocuments hook
 * Custom hook for document operations and state management
 */

import { useState, useCallback, useEffect } from 'react';
import { Document, CreateDocumentRequest } from '../types';
import documentService from '../services/documentService';

interface UseDocumentsState {
  documents: Document[];
  loading: boolean;
  error: string | null;
}

interface UseDocumentsActions {
  fetchDocuments: (type?: 'my' | 'public') => Promise<void>;
  createDocument: (data: FormData) => Promise<Document>;
  updateDocument: (id: string, data: Partial<CreateDocumentRequest>) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  getDocument: (id: string) => Promise<Document>;
  clearError: () => void;
}

export interface UseDocumentsReturn extends UseDocumentsState, UseDocumentsActions {}

/**
 * Hook for document operations
 * Manages document state and provides methods for CRUD operations
 */
export function useDocuments(): UseDocumentsReturn {
  const [state, setState] = useState<UseDocumentsState>({
    documents: [],
    loading: false,
    error: null,
  });

  // Fetch documents (my documents or public)
  const fetchDocuments = useCallback(
    async (type: 'my' | 'public' = 'my') => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const documents =
          type === 'my'
            ? await documentService.getMyDocuments()
            : await documentService.getPublicDocuments();

        setState((prev) => ({ ...prev, documents, loading: false }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch documents';
        setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
        throw err;
      }
    },
    []
  );

  // Create document
  const createDocument = useCallback(async (formData: FormData) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const newDocument = await documentService.createDocument(formData);

      setState((prev) => ({
        ...prev,
        documents: [newDocument, ...prev.documents],
        loading: false,
      }));

      return newDocument;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create document';
      setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  // Update document
  const updateDocument = useCallback(
    async (id: string, data: Partial<CreateDocumentRequest>) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const updated = await documentService.updateDocument(id, data);

        setState((prev) => ({
          ...prev,
          documents: prev.documents.map((doc) =>
            doc.id === id ? updated : doc
          ),
          loading: false,
        }));

        return updated;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update document';
        setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
        throw err;
      }
    },
    []
  );

  // Delete document
  const deleteDocument = useCallback(async (id: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      await documentService.deleteDocument(id);

      setState((prev) => ({
        ...prev,
        documents: prev.documents.filter((doc) => doc.id !== id),
        loading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete document';
      setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  // Get single document
  const getDocument = useCallback(async (id: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const document = await documentService.getDocument(id);

      setState((prev) => ({ ...prev, loading: false }));

      return document;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch document';
      setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    documents: state.documents,
    loading: state.loading,
    error: state.error,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    clearError,
  };
}

export default useDocuments;
