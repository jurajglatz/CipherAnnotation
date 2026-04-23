/**
 * usePages hook
 * Custom hook for page operations and state management
 */

import { useState, useCallback } from 'react';
import { Page } from '../types';
import pageService from '../services/pageService';

interface UsePagesState {
  pages: Page[];
  currentPage: Page | null;
  loading: boolean;
  error: string | null;
}

interface UsePagesActions {
  fetchPages: (documentId: string) => Promise<void>;
  fetchPage: (documentId: string, pageId: string) => Promise<void>;
  preprocessPage: (
    documentId: string,
    pageId: string,
    operations: { name: string; value?: number }[]
  ) => Promise<void>;
  setCurrentPage: (page: Page | null) => void;
  clearError: () => void;
}

export interface UsePagesReturn extends UsePagesState, UsePagesActions {}

/**
 * Hook for page operations
 * Manages page state and provides methods for page retrieval and preprocessing
 */
export function usePages(): UsePagesReturn {
  const [state, setState] = useState<UsePagesState>({
    pages: [],
    currentPage: null,
    loading: false,
    error: null,
  });

  // Fetch all pages for a document
  const fetchPages = useCallback(async (documentId: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const pages = await pageService.getPages(documentId);

      setState((prev) => ({ ...prev, pages, loading: false }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch pages';
      setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  // Fetch single page
  const fetchPage = useCallback(
    async (documentId: string, pageId: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const page = await pageService.getPage(documentId, pageId);

        setState((prev) => ({
          ...prev,
          currentPage: page,
          pages: prev.pages.map((p) => (p.id === pageId ? page : p)),
          loading: false,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch page';
        setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
        throw err;
      }
    },
    []
  );

  // Preprocess page
  const preprocessPage = useCallback(
    async (
      documentId: string,
      pageId: string,
      operations: { name: string; value?: number }[]
    ) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const page = await pageService.preprocessPage(
          documentId,
          pageId,
          operations
        );

        setState((prev) => ({
          ...prev,
          currentPage: page,
          pages: prev.pages.map((p) => (p.id === pageId ? page : p)),
          loading: false,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to preprocess page';
        setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
        throw err;
      }
    },
    []
  );

  // Set current page
  const setCurrentPage = useCallback((page: Page | null) => {
    setState((prev) => ({ ...prev, currentPage: page }));
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    pages: state.pages,
    currentPage: state.currentPage,
    loading: state.loading,
    error: state.error,
    fetchPages,
    fetchPage,
    preprocessPage,
    setCurrentPage,
    clearError,
  };
}

export default usePages;
