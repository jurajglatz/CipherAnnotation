/**
 * useAnnotations hook
 * Custom hook for annotation operations and state management
 */

import { useState, useCallback } from 'react';
import {
  SectionAnnotation,
  PairAnnotation,
  ElementAnnotation,
  BoundingBox,
  ElementType,
} from '../types';
import annotationService, { UpdatePairData, UpdateElementData } from '../services/annotationService';

interface UseAnnotationsState {
  sections: SectionAnnotation[];
  loading: boolean;
  error: string | null;
}

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

interface UseAnnotationsActions {
  fetchAnnotations: (pageId: string) => Promise<void>;
  createSection: (pageId: string, data: CreateSectionData) => Promise<SectionAnnotation>;
  updateSection: (
    pageId: string,
    sectionId: string,
    data: Partial<CreateSectionData>
  ) => Promise<SectionAnnotation>;
  deleteSection: (pageId: string, sectionId: string) => Promise<void>;
  createPair: (
    pageId: string,
    sectionId: string,
    data: CreatePairData
  ) => Promise<PairAnnotation>;
  updatePair: (
    pageId: string,
    pairId: string,
    data: UpdatePairData
  ) => Promise<PairAnnotation>;
  deletePair: (pageId: string, pairId: string) => Promise<void>;
  createElement: (
    pageId: string,
    pairId: string,
    data: CreateElementData
  ) => Promise<ElementAnnotation>;
  updateElement: (
    pageId: string,
    elementId: string,
    data: UpdateElementData
  ) => Promise<ElementAnnotation>;
  deleteElement: (pageId: string, elementId: string) => Promise<void>;
  updateBoundingBox: (
    pageId: string,
    boxId: string,
    data: BoundingBox
  ) => Promise<BoundingBox>;
  applyAnnotationUpdate: (
    type: 'section' | 'pair' | 'element',
    updated: any
  ) => void;
  clearError: () => void;
}

export interface UseAnnotationsReturn extends UseAnnotationsState, UseAnnotationsActions {}

/**
 * Hook for annotation operations
 * Manages annotation state and provides methods for section, pair, and element operations
 */
export function useAnnotations(): UseAnnotationsReturn {
  const [state, setState] = useState<UseAnnotationsState>({
    sections: [],
    loading: false,
    error: null,
  });

  // Fetch all annotations for a page
  const fetchAnnotations = useCallback(async (pageId: string) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const sections = await annotationService.getAnnotations(pageId);

      setState((prev) => ({ ...prev, sections, loading: false }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch annotations';
      setState((prev) => ({ ...prev, error: errorMessage, loading: false }));
      throw err;
    }
  }, []);

  // Create section
  const createSection = useCallback(
    async (pageId: string, data: CreateSectionData) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const section = await annotationService.createSection(pageId, data);

        setState((prev) => ({
          ...prev,
          sections: [...prev.sections, section],
          loading: false,
        }));

        return section;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create section';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Update section
  const updateSection = useCallback(
    async (
      pageId: string,
      sectionId: string,
      data: Partial<CreateSectionData>
    ) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const updated = await annotationService.updateSection(
          pageId,
          sectionId,
          data
        );

        setState((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === sectionId ? updated : s
          ),
          loading: false,
        }));

        return updated;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update section';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Delete section
  const deleteSection = useCallback(
    async (pageId: string, sectionId: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        await annotationService.deleteSection(pageId, sectionId);

        setState((prev) => ({
          ...prev,
          sections: prev.sections.filter((s) => s.id !== sectionId),
          loading: false,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete section';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Create pair
  const createPair = useCallback(
    async (pageId: string, sectionId: string, data: CreatePairData) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const pair = await annotationService.createPair(
          pageId,
          sectionId,
          data
        );

        setState((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.id === sectionId
              ? {
                  ...s,
                  pairAnnotations: [
                    ...(s.pairAnnotations || []),
                    pair,
                  ],
                }
              : s
          ),
          loading: false,
        }));

        return pair;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create pair';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Update pair
  const updatePair = useCallback(
    async (pageId: string, pairId: string, data: UpdatePairData) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const updated = await annotationService.updatePair(
          pageId,
          pairId,
          data
        );

        setState((prev) => {
          const newSectionId = updated.sectionId;
          return {
            ...prev,
            sections: prev.sections.map((s) => {
              const existing = s.pairAnnotations?.find((p) => p.id === pairId);
              if (s.id === newSectionId) {
                if (existing) {
                  return {
                    ...s,
                    pairAnnotations: s.pairAnnotations?.map((p) =>
                      p.id === pairId ? { ...updated, elementAnnotations: existing.elementAnnotations } : p
                    ),
                  };
                }
                const movedFromOther = prev.sections
                  .flatMap((os) => os.pairAnnotations ?? [])
                  .find((p) => p.id === pairId);
                return {
                  ...s,
                  pairAnnotations: [
                    ...(s.pairAnnotations ?? []),
                    { ...updated, elementAnnotations: movedFromOther?.elementAnnotations ?? [] },
                  ],
                };
              }
              if (existing) {
                return {
                  ...s,
                  pairAnnotations: s.pairAnnotations?.filter((p) => p.id !== pairId),
                };
              }
              return s;
            }),
            loading: false,
          };
        });

        return updated;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update pair';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Delete pair
  const deletePair = useCallback(
    async (pageId: string, pairId: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        await annotationService.deletePair(pageId, pairId);

        setState((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            pairAnnotations: s.pairAnnotations?.filter(
              (p) => p.id !== pairId
            ),
          })),
          loading: false,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete pair';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Create element
  const createElement = useCallback(
    async (pageId: string, pairId: string, data: CreateElementData) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const element = await annotationService.createElement(
          pageId,
          pairId,
          data
        );

        setState((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            pairAnnotations: s.pairAnnotations?.map((p) =>
              p.id === pairId
                ? {
                    ...p,
                    elementAnnotations: [
                      ...(p.elementAnnotations || []),
                      element,
                    ],
                  }
                : p
            ),
          })),
          loading: false,
        }));

        return element;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create element';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Update element
  const updateElement = useCallback(
    async (
      pageId: string,
      elementId: string,
      data: UpdateElementData
    ) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const updated = await annotationService.updateElement(
          pageId,
          elementId,
          data
        );

        setState((prev) => {
          const newPairId = updated.pairId;
          return {
            ...prev,
            sections: prev.sections.map((s) => ({
              ...s,
              pairAnnotations: s.pairAnnotations?.map((p) => {
                const existing = p.elementAnnotations?.find((e) => e.id === elementId);
                if (p.id === newPairId) {
                  if (existing) {
                    return {
                      ...p,
                      elementAnnotations: p.elementAnnotations?.map((e) =>
                        e.id === elementId ? updated : e
                      ),
                    };
                  }
                  return {
                    ...p,
                    elementAnnotations: [...(p.elementAnnotations ?? []), updated],
                  };
                }
                if (existing) {
                  return {
                    ...p,
                    elementAnnotations: p.elementAnnotations?.filter((e) => e.id !== elementId),
                  };
                }
                return p;
              }),
            })),
            loading: false,
          };
        });

        return updated;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to update element';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Delete element
  const deleteElement = useCallback(
    async (pageId: string, elementId: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        await annotationService.deleteElement(pageId, elementId);

        setState((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            pairAnnotations: s.pairAnnotations?.map((p) => ({
              ...p,
              elementAnnotations: p.elementAnnotations?.filter(
                (e) => e.id !== elementId
              ),
            })),
          })),
          loading: false,
        }));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete element';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Update bounding box
  const updateBoundingBox = useCallback(
    async (pageId: string, boxId: string, data: BoundingBox) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const updatedBox = await annotationService.updateBoundingBox(
          pageId,
          boxId,
          data
        );

        // Update local state with new bounding box coordinates
        setState((prev) => ({
          ...prev,
          sections: prev.sections.map((s) => {
            if (s.id === boxId) {
              return { ...s, boundingBox: data };
            }
            return {
              ...s,
              pairAnnotations: s.pairAnnotations?.map((p) => {
                if (p.id === boxId) {
                  return { ...p, boundingBox: data };
                }
                return {
                  ...p,
                  elementAnnotations: p.elementAnnotations?.map((e) =>
                    e.id === boxId ? { ...e, boundingBox: data } : e
                  ),
                };
              }),
            };
          }),
          loading: false,
        }));

        return updatedBox;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to update bounding box';
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
        throw err;
      }
    },
    []
  );

  // Merge a server-returned annotation into local state without an API call.
  // Used when a component (e.g. PropertiesPanel) saves via the service directly
  // but we still need `sections` to reflect the updated fields.
  const applyAnnotationUpdate = useCallback(
    (type: 'section' | 'pair' | 'element', updated: any) => {
      setState((prev) => {
        if (type === 'section') {
          return {
            ...prev,
            sections: prev.sections.map((s) =>
              s.id === updated.id
                ? { ...updated, pairAnnotations: s.pairAnnotations }
                : s
            ),
          };
        }
        if (type === 'pair') {
          return {
            ...prev,
            sections: prev.sections.map((s) => ({
              ...s,
              pairAnnotations: s.pairAnnotations?.map((p) =>
                p.id === updated.id
                  ? { ...updated, elementAnnotations: p.elementAnnotations }
                  : p
              ),
            })),
          };
        }
        return {
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            pairAnnotations: s.pairAnnotations?.map((p) => ({
              ...p,
              elementAnnotations: p.elementAnnotations?.map((e) =>
                e.id === updated.id ? updated : e
              ),
            })),
          })),
        };
      });
    },
    []
  );

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    sections: state.sections,
    loading: state.loading,
    error: state.error,
    fetchAnnotations,
    createSection,
    updateSection,
    deleteSection,
    createPair,
    updatePair,
    deletePair,
    createElement,
    updateElement,
    deleteElement,
    updateBoundingBox,
    applyAnnotationUpdate,
    clearError,
  };
}

export default useAnnotations;
