/**
 * Annotation service — unified annotation CRUD.
 */

import api from './api';
import {
  Annotation,
  BoundingBox,
  AnnotationType,
  DocumentAnnotationRef,
} from '../types';

export interface CreateAnnotationData {
  parentId?: string | null;
  captionId?: string;
  type: AnnotationType;
  content?: string;
  transcription?: string;
  transcriptionRefId?: string | null;
  symbolId?: string | null;
  orientation: number;
  boundingBox: BoundingBox;
}

export type UpdateAnnotationData = Partial<CreateAnnotationData> & {
  parentId?: string | null;
  /** True to clear the canonical-symbol link. */
  clearSymbol?: boolean;
};

export interface AutoAnnotateAllResult {
  appliedCount: number;
  failedCount: number;
  totalCreated: number;
}

class AnnotationService {
  async list(pageId: string): Promise<Annotation[]> {
    const res = await api.get<Annotation[]>(`/pages/${pageId}/annotations`);
    return res.data;
  }

  async create(pageId: string, data: CreateAnnotationData): Promise<Annotation> {
    const res = await api.post<Annotation>(`/pages/${pageId}/annotations`, data);
    return res.data;
  }

  async update(
    pageId: string,
    annotationId: string,
    data: UpdateAnnotationData,
  ): Promise<Annotation> {
    // The backend cannot distinguish "parentId omitted" from "parentId: null"
    // on a nullable Guid, so signal a detach-to-root via clearParent instead.
    const body: Record<string, unknown> = { ...data };
    if ('parentId' in data && data.parentId === null) {
      delete body.parentId;
      body.clearParent = true;
    }
    if ('symbolId' in data && data.symbolId === null) {
      delete body.symbolId;
      body.clearSymbol = true;
    }
    const res = await api.put<Annotation>(
      `/pages/${pageId}/annotations/${annotationId}`,
      body,
    );
    return res.data;
  }

  async remove(pageId: string, annotationId: string): Promise<void> {
    await api.delete(`/pages/${pageId}/annotations/${annotationId}`);
  }

  async updateBoundingBox(
    pageId: string,
    annotationId: string,
    box: BoundingBox,
  ): Promise<BoundingBox> {
    const res = await api.put<BoundingBox>(
      `/pages/${pageId}/annotations/boundingboxes/${annotationId}`,
      box,
    );
    return res.data;
  }

  async autoAnnotate(
    pageId: string,
    opts: { replaceExisting?: boolean } = {},
  ): Promise<Annotation[]> {
    const params = new URLSearchParams();
    if (opts.replaceExisting) params.set('replaceExisting', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await api.post<Annotation[]>(`/pages/${pageId}/auto-annotate${qs}`);
    return res.data;
  }

  async autoAnnotateAll(
    documentId: string,
    opts: { excludePageId?: string; replaceExisting?: boolean } = {},
  ): Promise<AutoAnnotateAllResult> {
    const params = new URLSearchParams();
    if (opts.excludePageId) params.set('excludePageId', opts.excludePageId);
    if (opts.replaceExisting) params.set('replaceExisting', 'true');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await api.post<AutoAnnotateAllResult>(
      `/documents/${documentId}/auto-annotate${qs}`,
    );
    return res.data;
  }

  async listForDocument(
    documentId: string,
    opts: {
      type?: AnnotationType;
      currentPageId?: string;
      /** Restrict to children of this annotation (siblings of the caller). */
      parentId?: string;
      /** Restrict to root-level annotations (no parent). Ignored if parentId is set. */
      rootOnly?: boolean;
    } = {},
  ): Promise<DocumentAnnotationRef[]> {
    const params = new URLSearchParams();
    if (opts.type) params.set('type', opts.type);
    if (opts.currentPageId) params.set('currentPageId', opts.currentPageId);
    if (opts.parentId) params.set('parentId', opts.parentId);
    else if (opts.rootOnly) params.set('rootOnly', 'true');
    const qs = params.toString();
    const url = `/documents/${documentId}/annotations${qs ? `?${qs}` : ''}`;
    const res = await api.get<DocumentAnnotationRef[]>(url);
    return res.data;
  }
}

export default new AnnotationService();
