/**
 * Annotation service
 * Handles section, pair, and element annotation operations
 */

import api from './api';
import {
  SectionAnnotation,
  PairAnnotation,
  ElementAnnotation,
  BoundingBox,
  ElementType,
} from '../types';

interface CreateSectionData {
  label?: string;
  orientation?: number;
  boundingBox: BoundingBox;
}

interface CreatePairData {
  order: number;
  orientation?: number;
  boundingBox: BoundingBox;
}

interface CreateElementData {
  type: ElementType;
  content?: string;
  transcription?: string;
  symbolId?: string;
  boundingBox: BoundingBox;
  orientation?: number;
}

export type UpdatePairData = Partial<CreatePairData> & { sectionId?: string };
export type UpdateElementData = Partial<CreateElementData> & { pairId?: string };

class AnnotationService {
  /**
   * Get all annotations for a page
   */
  async getAnnotations(pageId: string): Promise<SectionAnnotation[]> {
    const response = await api.get<SectionAnnotation[]>(
      `/pages/${pageId}/annotations`
    );
    return response.data;
  }

  // ========== SECTION ANNOTATIONS ==========

  /**
   * Create new section annotation
   */
  async createSection(
    pageId: string,
    data: CreateSectionData
  ): Promise<SectionAnnotation> {
    const response = await api.post<SectionAnnotation>(
      `/pages/${pageId}/annotations/sections`,
      data
    );
    return response.data;
  }

  /**
   * Update section annotation
   */
  async updateSection(
    pageId: string,
    sectionId: string,
    data: Partial<CreateSectionData>
  ): Promise<SectionAnnotation> {
    const response = await api.put<SectionAnnotation>(
      `/pages/${pageId}/annotations/sections/${sectionId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete section annotation
   */
  async deleteSection(pageId: string, sectionId: string): Promise<void> {
    await api.delete(`/pages/${pageId}/annotations/sections/${sectionId}`);
  }

  // ========== PAIR ANNOTATIONS ==========

  /**
   * Create new pair annotation within a section
   */
  async createPair(
    pageId: string,
    sectionId: string,
    data: CreatePairData
  ): Promise<PairAnnotation> {
    const response = await api.post<PairAnnotation>(
      `/pages/${pageId}/annotations/sections/${sectionId}/pairs`,
      data
    );
    return response.data;
  }

  /**
   * Update pair annotation
   */
  async updatePair(
    pageId: string,
    pairId: string,
    data: UpdatePairData
  ): Promise<PairAnnotation> {
    const response = await api.put<PairAnnotation>(
      `/pages/${pageId}/annotations/pairs/${pairId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete pair annotation
   */
  async deletePair(pageId: string, pairId: string): Promise<void> {
    await api.delete(`/pages/${pageId}/annotations/pairs/${pairId}`);
  }

  // ========== ELEMENT ANNOTATIONS ==========

  /**
   * Create new element annotation within a pair
   */
  async createElement(
    pageId: string,
    pairId: string,
    data: CreateElementData
  ): Promise<ElementAnnotation> {
    const response = await api.post<ElementAnnotation>(
      `/pages/${pageId}/annotations/pairs/${pairId}/elements`,
      data
    );
    return response.data;
  }

  /**
   * Update element annotation
   */
  async updateElement(
    pageId: string,
    elementId: string,
    data: UpdateElementData
  ): Promise<ElementAnnotation> {
    const response = await api.put<ElementAnnotation>(
      `/pages/${pageId}/annotations/elements/${elementId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete element annotation
   */
  async deleteElement(pageId: string, elementId: string): Promise<void> {
    await api.delete(`/pages/${pageId}/annotations/elements/${elementId}`);
  }

  // ========== BOUNDING BOX ==========

  /**
   * Update bounding box for annotation
   * @param pageId Page ID
   * @param boxId Box ID (section, pair, or element ID)
   * @param data New bounding box coordinates
   */
  async updateBoundingBox(
    pageId: string,
    boxId: string,
    data: BoundingBox
  ): Promise<BoundingBox> {
    const response = await api.put<BoundingBox>(
      `/pages/${pageId}/annotations/boundingboxes/${boxId}`,
      data
    );
    return response.data;
  }

  /**
   * Bulk update bounding boxes
   */
  async updateBoundingBoxes(
    pageId: string,
    updates: Array<{ id: string; box: BoundingBox }>
  ): Promise<BoundingBox[]> {
    const response = await api.put<BoundingBox[]>(
      `/pages/${pageId}/annotations/boundingboxes/bulk`,
      { updates }
    );
    return response.data;
  }
}

export default new AnnotationService();
