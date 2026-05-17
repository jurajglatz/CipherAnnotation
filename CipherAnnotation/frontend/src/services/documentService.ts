/**
 * Document service
 * Handles document CRUD operations and sharing
 */

import api from './api';
import { Document, CreateDocumentRequest, DocumentShare, PermissionType } from '../types';

class DocumentService {
  /**
   * Get all documents owned by current user
   */
  async getMyDocuments(): Promise<Document[]> {
    const response = await api.get<Document[]>('/documents');
    return response.data;
  }

  /**
   * Get all public documents
   */
  async getPublicDocuments(): Promise<Document[]> {
    const response = await api.get<Document[]>('/documents/public');
    return response.data;
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document> {
    const response = await api.get<Document>(`/documents/${id}`);
    return response.data;
  }

  /**
   * Create new document with file upload
   * @param formData FormData with 'file' and metadata fields
   */
  async createDocument(formData: FormData): Promise<Document> {
    const response = await api.post<Document>('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    id: string,
    data: Partial<CreateDocumentRequest>
  ): Promise<Document> {
    const response = await api.put<Document>(`/documents/${id}`, data);
    return response.data;
  }

  /**
   * Delete document
   */
  async deleteDocument(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  }

  /**
   * Duplicate document (clones pages, captions, annotations).
   */
  async duplicateDocument(id: string): Promise<Document> {
    const response = await api.post<Document>(`/documents/${id}/duplicate`);
    return response.data;
  }

  /**
   * Share document with another user
   */
  async shareDocument(
    id: string,
    email: string,
    permission: PermissionType
  ): Promise<DocumentShare> {
    const response = await api.post<DocumentShare>(
      `/documents/${id}/share`,
      {
        userEmail: email,
        permission,
      }
    );
    return response.data;
  }

  /**
   * Remove document share
   */
  async removeShare(docId: string, shareId: string): Promise<void> {
    await api.delete(`/documents/${docId}/share/${shareId}`);
  }

  /**
   * Get document shares
   */
  async getShares(docId: string): Promise<DocumentShare[]> {
    const response = await api.get<DocumentShare[]>(
      `/documents/${docId}/shares`
    );
    return response.data;
  }
}

export default new DocumentService();
