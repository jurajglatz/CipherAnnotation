/**
 * PropertiesPanel Component
 * Right sidebar showing properties of selected annotation
 */

import React, { useState, useEffect } from 'react';
import { Trash2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  SectionAnnotation,
  PairAnnotation,
  ElementAnnotation,
  ElementType,
  Symbol,
  BoundingBox,
} from '@/types';
import { annotationService, symbolService } from '@/services';
import { ConfirmDialog } from '@/components/shared';
import { SymbolPicker } from './SymbolPicker';
import { CreateSymbolDialog } from './CreateSymbolDialog';

interface SelectedAnnotation {
  id: string;
  type: 'section' | 'pair' | 'element';
  data: any;
}

interface PropertiesPanelProps {
  selectedAnnotation: SelectedAnnotation | null;
  pageId: string;
  pageImageUrl?: string;
  pageWidth?: number;
  pageHeight?: number;
  onAnnotationUpdated: (updated: any) => void;
  onLivePreview?: (
    preview: { id: string; orientation?: number; boundingBox?: BoundingBox } | null
  ) => void;
  onDelete?: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedAnnotation,
  pageId,
  pageImageUrl,
  pageWidth,
  pageHeight,
  onAnnotationUpdated,
  onLivePreview,
  onDelete,
}) => {
  // Fire live preview (orientation + bbox) whenever a selected annotation's
  // form fields change, so the canvas reflects edits without needing a save.
  const firePreview = (
    orientation: number,
    bbox: BoundingBox
  ) => {
    if (!onLivePreview || !selectedAnnotation) return;
    onLivePreview({ id: selectedAnnotation.id, orientation, boundingBox: bbox });
  };
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Symbols state (for element assignment)
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false);
  const [showCreateSymbol, setShowCreateSymbol] = useState(false);

  const loadSymbols = async () => {
    try {
      setIsLoadingSymbols(true);
      const list = await symbolService.getSymbols();
      setSymbols(list);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load symbols';
      toast.error(message);
    } finally {
      setIsLoadingSymbols(false);
    }
  };

  useEffect(() => {
    if (selectedAnnotation?.type === 'element' && symbols.length === 0) {
      loadSymbols();
    }
  }, [selectedAnnotation?.type]);

  // Form state for section
  const [sectionLabel, setSectionLabel] = useState('');
  const [sectionOrientation, setSectionOrientation] = useState(0);
  const [sectionBBox, setSectionBBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Form state for pair
  const [pairOrder, setPairOrder] = useState(0);
  const [pairOrientation, setPairOrientation] = useState(0);
  const [pairBBox, setPairBBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Form state for element
  const [elementType, setElementType] = useState<ElementType>('Plaintext');
  const [elementContent, setElementContent] = useState('');
  const [elementTranscription, setElementTranscription] = useState('');
  const [elementSymbolId, setElementSymbolId] = useState('');
  const [elementOrientation, setElementOrientation] = useState(0);
  const [elementBBox, setElementBBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  // Update form state when selection changes
  useEffect(() => {
    if (!selectedAnnotation) return;

    const { type, data } = selectedAnnotation;

    if (type === 'section') {
      setSectionLabel(data.label || '');
      setSectionOrientation(data.orientation || 0);
      setSectionBBox(data.boundingBox);
    } else if (type === 'pair') {
      setPairOrder(data.order || 0);
      setPairOrientation(data.orientation || 0);
      setPairBBox(data.boundingBox);
    } else if (type === 'element') {
      setElementType(data.type || 'Plaintext');
      setElementContent(data.content || '');
      setElementTranscription(data.transcription || '');
      setElementSymbolId(data.symbolId || '');
      setElementOrientation(data.orientation || 0);
      setElementBBox(data.boundingBox);
    }
  }, [selectedAnnotation]);

  // Live preview: push current orientation/bbox to canvas whenever they change
  useEffect(() => {
    if (selectedAnnotation?.type === 'section') {
      firePreview(sectionOrientation, sectionBBox);
    }
  }, [sectionOrientation, sectionBBox, selectedAnnotation?.id, selectedAnnotation?.type]);

  useEffect(() => {
    if (selectedAnnotation?.type === 'pair') {
      firePreview(pairOrientation, pairBBox);
    }
  }, [pairOrientation, pairBBox, selectedAnnotation?.id, selectedAnnotation?.type]);

  useEffect(() => {
    if (selectedAnnotation?.type === 'element') {
      firePreview(elementOrientation, elementBBox);
    }
  }, [elementOrientation, elementBBox, selectedAnnotation?.id, selectedAnnotation?.type]);

  // Handle save for section
  const handleSaveSection = async () => {
    if (!selectedAnnotation || selectedAnnotation.type !== 'section') return;

    try {
      setIsSaving(true);
      const updated = await annotationService.updateSection(
        pageId,
        selectedAnnotation.id,
        {
          label: sectionLabel,
          orientation: sectionOrientation,
          boundingBox: sectionBBox,
        }
      );
      onAnnotationUpdated(updated);
      toast.success('Section updated');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save for pair
  const handleSavePair = async () => {
    if (!selectedAnnotation || selectedAnnotation.type !== 'pair') return;

    try {
      setIsSaving(true);
      const updated = await annotationService.updatePair(
        pageId,
        selectedAnnotation.id,
        {
          order: pairOrder,
          orientation: pairOrientation,
          boundingBox: pairBBox,
        }
      );
      onAnnotationUpdated(updated);
      toast.success('Pair updated');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle save for element
  const handleSaveElement = async () => {
    if (!selectedAnnotation || selectedAnnotation.type !== 'element') return;

    try {
      setIsSaving(true);
      const updated = await annotationService.updateElement(
        pageId,
        selectedAnnotation.id,
        {
          type: elementType,
          content: elementContent,
          transcription: elementTranscription,
          symbolId: elementSymbolId || undefined,
          orientation: elementOrientation,
          boundingBox: elementBBox,
        }
      );
      onAnnotationUpdated(updated);
      toast.success('Element updated');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedAnnotation || !onDelete) return;

    try {
      setIsDeleting(true);
      await onDelete();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete';
      toast.error(message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!selectedAnnotation) {
    return (
      <div className="p-4 h-full flex items-center justify-center text-center">
        <p className="font-serif italic text-ink-900/60 text-sm">
          Select an annotation to view and edit properties
        </p>
      </div>
    );
  }

  const { type } = selectedAnnotation;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sepia-600/20">
        <h3 className="font-serif text-xl font-semibold text-ink-900 capitalize">
          {type} <em className="italic font-normal text-sepia-700">Properties</em>
        </h3>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {type === 'section' && (
          <>
            {/* Label */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Label
              </label>
              <input
                type="text"
                value={sectionLabel}
                onChange={(e) => setSectionLabel(e.target.value)}
                className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                placeholder="Section label"
              />
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Orientation (degrees)
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  value={sectionOrientation}
                  onChange={(e) => setSectionOrientation(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                />
                <select
                  value={[0, 45, 90, 135, 180, 225, 270, 315].includes(sectionOrientation) ? sectionOrientation : ''}
                  onChange={(e) => setSectionOrientation(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900 text-sm"
                >
                  <option value="">Preset…</option>
                  <option value={0}>0°</option>
                  <option value={45}>45°</option>
                  <option value={90}>90°</option>
                  <option value={135}>135°</option>
                  <option value={180}>180°</option>
                  <option value={225}>225°</option>
                  <option value={270}>270°</option>
                  <option value={315}>315°</option>
                </select>
              </div>
            </div>

            {/* Bounding Box */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-2">
                Bounding Box
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">x</label>
                  <input
                    type="number"
                    value={sectionBBox.x}
                    onChange={(e) =>
                      setSectionBBox({
                        ...sectionBBox,
                        x: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">y</label>
                  <input
                    type="number"
                    value={sectionBBox.y}
                    onChange={(e) =>
                      setSectionBBox({
                        ...sectionBBox,
                        y: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">w</label>
                  <input
                    type="number"
                    value={sectionBBox.width}
                    onChange={(e) =>
                      setSectionBBox({
                        ...sectionBBox,
                        width: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">h</label>
                  <input
                    type="number"
                    value={sectionBBox.height}
                    onChange={(e) =>
                      setSectionBBox({
                        ...sectionBBox,
                        height: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
              </div>
            </div>

            {/* Created date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Created
              </label>
              <p className="text-sm text-ink-900 font-serif">
                {new Date(selectedAnnotation.data.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Pair count */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Pairs
              </label>
              <p className="text-sm text-ink-900 font-serif">
                {selectedAnnotation.data.pairAnnotations?.length || 0}
              </p>
            </div>
          </>
        )}

        {type === 'pair' && (
          <>
            {/* Orientation */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Orientation (degrees)
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  value={pairOrientation}
                  onChange={(e) => setPairOrientation(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                />
                <select
                  value={[0, 45, 90, 135, 180, 225, 270, 315].includes(pairOrientation) ? pairOrientation : ''}
                  onChange={(e) => setPairOrientation(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900 text-sm"
                >
                  <option value="">Preset…</option>
                  <option value={0}>0°</option>
                  <option value={45}>45°</option>
                  <option value={90}>90°</option>
                  <option value={135}>135°</option>
                  <option value={180}>180°</option>
                  <option value={225}>225°</option>
                  <option value={270}>270°</option>
                  <option value={315}>315°</option>
                </select>
              </div>
            </div>

            {/* Bounding Box */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-2">
                Bounding Box
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">x</label>
                  <input
                    type="number"
                    value={pairBBox.x}
                    onChange={(e) =>
                      setPairBBox({
                        ...pairBBox,
                        x: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">y</label>
                  <input
                    type="number"
                    value={pairBBox.y}
                    onChange={(e) =>
                      setPairBBox({
                        ...pairBBox,
                        y: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">w</label>
                  <input
                    type="number"
                    value={pairBBox.width}
                    onChange={(e) =>
                      setPairBBox({
                        ...pairBBox,
                        width: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">h</label>
                  <input
                    type="number"
                    value={pairBBox.height}
                    onChange={(e) =>
                      setPairBBox({
                        ...pairBBox,
                        height: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
              </div>
            </div>

            {/* Element count */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Elements
              </label>
              <p className="text-sm text-ink-900 font-serif">
                {selectedAnnotation.data.elementAnnotations?.length || 0}
              </p>
            </div>
          </>
        )}

        {type === 'element' && (
          <>
            {/* Type */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Type
              </label>
              <select
                value={elementType}
                onChange={(e) => {
                  const next = e.target.value as ElementType;
                  setElementType(next);
                  if (next === 'Plaintext') setElementSymbolId('');
                }}
                className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
              >
                <option value="Plaintext">Plaintext</option>
                <option value="Ciphertext">Ciphertext</option>
              </select>
            </div>

            {/* Content */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Content
              </label>
              <textarea
                value={elementContent}
                onChange={(e) => setElementContent(e.target.value)}
                className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900 resize-none"
                rows={2}
                placeholder="Element content"
              />
            </div>

            {/* Transcription */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Transcription
              </label>
              <textarea
                value={elementTranscription}
                onChange={(e) => setElementTranscription(e.target.value)}
                className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900 resize-none"
                rows={2}
                placeholder="Element transcription"
              />
            </div>

            {/* Symbol assignment — Ciphertext only */}
            {elementType === 'Ciphertext' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700">
                    Symbol
                  </label>
                  {elementSymbolId && (
                    <button
                      type="button"
                      onClick={() => setElementSymbolId('')}
                      className="text-xs text-sepia-700 hover:text-cipher-red transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {isLoadingSymbols ? (
                  <p className="text-sm font-serif italic text-ink-900/60">Loading symbols...</p>
                ) : (
                  <SymbolPicker
                    symbols={symbols}
                    selectedSymbolId={elementSymbolId || undefined}
                    onSelect={(id) => setElementSymbolId(id)}
                    onCreateNew={() => setShowCreateSymbol(true)}
                  />
                )}
              </div>
            )}

            {/* Orientation */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                Orientation (degrees)
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  value={elementOrientation}
                  onChange={(e) => setElementOrientation(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                />
                <select
                  value={[0, 45, 90, 135, 180, 225, 270, 315].includes(elementOrientation) ? elementOrientation : ''}
                  onChange={(e) => setElementOrientation(Number(e.target.value))}
                  className="w-full px-2 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900 text-sm"
                >
                  <option value="">Preset…</option>
                  <option value={0}>0°</option>
                  <option value={45}>45°</option>
                  <option value={90}>90°</option>
                  <option value={135}>135°</option>
                  <option value={180}>180°</option>
                  <option value={225}>225°</option>
                  <option value={270}>270°</option>
                  <option value={315}>315°</option>
                </select>
              </div>
            </div>

            {/* Bounding Box */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-2">
                Bounding Box
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">x</label>
                  <input
                    type="number"
                    value={elementBBox.x}
                    onChange={(e) =>
                      setElementBBox({
                        ...elementBBox,
                        x: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">y</label>
                  <input
                    type="number"
                    value={elementBBox.y}
                    onChange={(e) =>
                      setElementBBox({
                        ...elementBBox,
                        y: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">w</label>
                  <input
                    type="number"
                    value={elementBBox.width}
                    onChange={(e) =>
                      setElementBBox({
                        ...elementBBox,
                        width: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-sepia-700/80 font-mono">h</label>
                  <input
                    type="number"
                    value={elementBBox.height}
                    onChange={(e) =>
                      setElementBBox({
                        ...elementBBox,
                        height: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="border-t border-sepia-600/20 p-4 space-y-2">
        <button
          onClick={
            type === 'section'
              ? handleSaveSection
              : type === 'pair'
                ? handleSavePair
                : handleSaveElement
          }
          disabled={isSaving}
          className="w-full flex items-center justify-center gap-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 py-2.5 rounded-md font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Apply Changes'}
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="w-full flex items-center justify-center gap-2 border border-cipher-red/40 text-cipher-red hover:bg-cipher-red/10 py-2.5 rounded-md font-medium transition-all disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Create symbol dialog */}
      <CreateSymbolDialog
        isOpen={showCreateSymbol}
        onClose={() => setShowCreateSymbol(false)}
        pageImageUrl={pageImageUrl}
        pageWidth={pageWidth}
        pageHeight={pageHeight}
        boundingBox={
          selectedAnnotation?.type === 'element'
            ? selectedAnnotation.data.boundingBox
            : undefined
        }
        onCreated={(symbol) => {
          setSymbols((prev) => [...prev, symbol]);
          setElementSymbolId(symbol.id);
        }}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete annotation?"
        message={`Are you sure you want to delete this ${type}? This action cannot be undone.`}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        isDangerous
      />
    </div>
  );
};

export default PropertiesPanel;
