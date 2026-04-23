/**
 * Page service
 * Handles page retrieval and preprocessing
 */

import api from './api';
import {
  Page,
  PreprocessHistoryState,
  ApplyPreprocessToAllResult,
} from '../types';

class PageService {
  /**
   * Get all pages for a document
   */
  async getPages(documentId: string): Promise<Page[]> {
    const response = await api.get<Page[]>(`/documents/${documentId}/pages`);
    return response.data;
  }

  /**
   * Get single page details
   */
  async getPage(documentId: string, pageId: string): Promise<Page> {
    const response = await api.get<Page>(
      `/documents/${documentId}/pages/${pageId}`
    );
    return response.data;
  }

  /**
   * Preprocess page with image operations
   * @param documentId Document ID
   * @param pageId Page ID
   * @param operations Array of preprocessing operations with optional parameters
   */
  async preprocessPage(
    documentId: string,
    pageId: string,
    operations: { name: string; value?: number }[]
  ): Promise<Page> {
    const response = await api.post<Page>(
      `/documents/${documentId}/pages/${pageId}/preprocess`,
      {
        operations,
      }
    );
    return response.data;
  }

  /**
   * Reset preprocessing for a page (revert to original image)
   */
  async resetPreprocessing(
    documentId: string,
    pageId: string
  ): Promise<Page> {
    const response = await api.delete<Page>(
      `/documents/${documentId}/pages/${pageId}/preprocess`
    );
    return response.data;
  }

  /**
   * Add new pages to an existing document
   */
  async addPages(documentId: string, files: File[]): Promise<Page[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file, file.name);
    });
    const response = await api.post<Page[]>(
      `/documents/${documentId}/pages`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    );
    return response.data;
  }

  /**
   * Get page image as blob
   */
  async getPageImage(documentId: string, pageId: string): Promise<Blob> {
    const response = await api.get(
      `/documents/${documentId}/pages/${pageId}/image`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /**
   * Get page processed image as blob
   */
  async getPageProcessedImage(
    documentId: string,
    pageId: string
  ): Promise<Blob> {
    const response = await api.get(
      `/documents/${documentId}/pages/${pageId}/processed-image`,
      {
        responseType: 'blob',
      }
    );
    return response.data;
  }

  /** Get the persisted per-page preprocess history. */
  async getPreprocessHistory(
    documentId: string,
    pageId: string
  ): Promise<PreprocessHistoryState> {
    const response = await api.get<PreprocessHistoryState>(
      `/documents/${documentId}/pages/${pageId}/preprocess/history`
    );
    return response.data;
  }

  /** Undo one step of backend preprocess history for a page. */
  async undoPreprocess(
    documentId: string,
    pageId: string
  ): Promise<PreprocessHistoryState> {
    const response = await api.post<PreprocessHistoryState>(
      `/documents/${documentId}/pages/${pageId}/preprocess/undo`
    );
    return response.data;
  }

  /** Redo one step of backend preprocess history for a page. */
  async redoPreprocess(
    documentId: string,
    pageId: string
  ): Promise<PreprocessHistoryState> {
    const response = await api.post<PreprocessHistoryState>(
      `/documents/${documentId}/pages/${pageId}/preprocess/redo`
    );
    return response.data;
  }

  /**
   * Apply the same preprocess batch to every page in a document. Operations are
   * chained on top of each page's current preprocess state — existing processing
   * is preserved.
   */
  async applyPreprocessToAllPages(
    documentId: string,
    operations: { name: string; value?: number }[]
  ): Promise<ApplyPreprocessToAllResult> {
    const response = await api.post<ApplyPreprocessToAllResult>(
      `/documents/${documentId}/pages/preprocess/apply-all`,
      { operations }
    );
    return response.data;
  }
}

export default new PageService();
