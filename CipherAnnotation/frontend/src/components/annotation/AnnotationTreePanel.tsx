/**
 * AnnotationTreePanel Component
 * Left sidebar showing annotation hierarchy as a collapsible tree
 */

import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Copy,
  Search,
  CopyPlus,
  ChevronsDownUp,
  ChevronsUpDown,
  Lock,
  LockOpen,
} from 'lucide-react';
import { SectionAnnotation, PairAnnotation, ElementAnnotation } from '@/types';
import toast from 'react-hot-toast';
import { Tooltip } from '@/components/shared';

interface SelectedAnnotation {
  id: string;
  type: 'section' | 'pair' | 'element';
  data: any;
}

interface LockButtonProps {
  id: string;
  directlyLocked: boolean;
  effectivelyLocked: boolean;
  onToggle: (id: string) => void;
}

const LockButton: React.FC<LockButtonProps> = ({
  id,
  directlyLocked,
  effectivelyLocked,
  onToggle,
}) => {
  const lockedByParent = effectivelyLocked && !directlyLocked;
  const title = directlyLocked
    ? 'Unlock'
    : lockedByParent
      ? 'Locked by parent'
      : 'Lock';
  const visibilityClass = directlyLocked || lockedByParent
    ? 'opacity-100'
    : 'opacity-0 group-hover:opacity-100';
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (lockedByParent) return;
        onToggle(id);
      }}
      disabled={lockedByParent}
      className={`p-1 rounded ${visibilityClass} ${
        lockedByParent ? 'cursor-not-allowed text-gray-400' : 'hover:bg-gray-300'
      }`}
      title={title}
    >
      {directlyLocked || lockedByParent ? (
        <Lock className="w-4 h-4" />
      ) : (
        <LockOpen className="w-4 h-4" />
      )}
    </button>
  );
};

interface AnnotationTreePanelProps {
  sections: SectionAnnotation[];
  selectedAnnotation: SelectedAnnotation | null;
  selectedIds?: Set<string>;
  onSelectAnnotation: (annotation: SelectedAnnotation | null, additive?: boolean) => void;
  onDeleteSection: (pageId: string, sectionId: string) => void;
  onDeletePair: (pageId: string, pairId: string) => void;
  onDeleteElement: (pageId: string, elementId: string) => void;
  onDuplicateSection: (section: SectionAnnotation) => void;
  onDuplicatePair: (pair: PairAnnotation, sectionId: string) => void;
  onDuplicateElement: (element: ElementAnnotation, pairId: string) => void;
  onDuplicateSelected?: () => void;
  lockedIds: Set<string>;
  effectivelyLockedIds: Set<string>;
  onToggleLock: (id: string) => void;
  pageId: string;
}

export const AnnotationTreePanel: React.FC<AnnotationTreePanelProps> = ({
  sections,
  selectedAnnotation,
  selectedIds,
  onSelectAnnotation,
  onDeleteSection,
  onDeletePair,
  onDeleteElement,
  onDuplicateSection,
  onDuplicatePair,
  onDuplicateElement,
  onDuplicateSelected,
  lockedIds,
  effectivelyLockedIds,
  onToggleLock,
  pageId,
}) => {
  // Classes added to an annotation row when it is effectively locked
  // (either directly or inherited from a locked ancestor).
  const lockedRowClass = (id: string) =>
    effectivelyLockedIds.has(id) ? 'opacity-60 italic' : '';
  const isSelected = (id: string) =>
    selectedIds && selectedIds.size > 0 ? selectedIds.has(id) : selectedAnnotation?.id === id;
  // Duplicate: if the item is part of a >1 multi-selection, duplicate the whole group
  const duplicateOr = (id: string, single: () => void) => {
    if (selectedIds && selectedIds.size > 1 && selectedIds.has(id) && onDuplicateSelected) {
      onDuplicateSelected();
    } else {
      single();
    }
  };
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    type: 'section' | 'pair' | 'element';
    id: string;
    x: number;
    y: number;
  } | null>(null);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Toggle pair expansion
  const togglePair = (pairId: string) => {
    setExpandedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(pairId)) {
        next.delete(pairId);
      } else {
        next.add(pairId);
      }
      return next;
    });
  };

  // Expand all sections and pairs
  const expandAll = () => {
    const allSectionIds = new Set<string>();
    const allPairIds = new Set<string>();
    sections.forEach((section) => {
      allSectionIds.add(section.id);
      section.pairAnnotations?.forEach((pair) => {
        allPairIds.add(pair.id);
      });
    });
    setExpandedSections(allSectionIds);
    setExpandedPairs(allPairIds);
  };

  // Collapse all sections and pairs
  const collapseAll = () => {
    setExpandedSections(new Set());
    setExpandedPairs(new Set());
  };

  // Format bounding box display
  const formatBBox = (bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    return `(${Math.round(bbox.x)}, ${Math.round(bbox.y)}, ${Math.round(bbox.width)}, ${Math.round(bbox.height)})`;
  };

  // Handle context menu
  const handleContextMenu = (
    e: React.MouseEvent,
    type: 'section' | 'pair' | 'element',
    id: string
  ) => {
    e.preventDefault();
    setContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  // Handle delete
  const handleDelete = (type: 'section' | 'pair' | 'element', id: string) => {
    if (type === 'section') {
      onDeleteSection(pageId, id);
      toast.success('Section deleted');
    } else if (type === 'pair') {
      onDeletePair(pageId, id);
      toast.success('Pair deleted');
    } else {
      onDeleteElement(pageId, id);
      toast.success('Element deleted');
    }
    setContextMenu(null);
  };

  // Handle copy bounding box
  const handleCopyBBox = (bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    const text = `${bbox.x},${bbox.y},${bbox.width},${bbox.height}`;
    navigator.clipboard.writeText(text);
    toast.success('Bounding box copied');
    setContextMenu(null);
  };

  // Filter sections by search
  const filteredSections = sections.filter(
    (section) =>
      section.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.id.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sepia-600/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl font-semibold text-ink-900">
            Annotations
          </h2>
          <div className="flex items-center gap-1">
            <Tooltip label="Expand all annotations">
              <button
                onClick={expandAll}
                className="p-1.5 text-sepia-700 hover:text-ink-900 hover:bg-parchment-100 rounded transition-colors"
              >
                <ChevronsUpDown className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip label="Collapse all annotations" position="left">
              <button
                onClick={collapseAll}
                className="p-1.5 text-sepia-700 hover:text-ink-900 hover:bg-parchment-100 rounded transition-colors"
              >
                <ChevronsDownUp className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia-600" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/60 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredSections.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-ink-900/60 font-serif italic">No annotations yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSections.map((section, sectionIndex) => (
              <div key={section.id}>
                {/* Section */}
                <div
                  className={`group flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                    isSelected(section.id)
                      ? 'bg-primary-700/10 text-ink-900 border border-primary-700/30'
                      : 'hover:bg-parchment-100 text-ink-900/80 border border-transparent'
                  } ${lockedRowClass(section.id)}`}
                  onClick={(e) =>
                    onSelectAnnotation(
                      { id: section.id, type: 'section', data: section },
                      e.metaKey || e.ctrlKey || e.shiftKey
                    )
                  }
                  onContextMenu={(e) =>
                    handleContextMenu(e, 'section', section.id)
                  }
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSection(section.id);
                    }}
                    className="p-0.5 hover:bg-gray-300 rounded"
                  >
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#4338ca' }} />

                  <div className="flex-1 min-w-0">
                    <div className="truncate font-semibold">
                      Section {sectionIndex + 1}
                      {section.label ? ` — ${section.label}` : ''}
                    </div>
                    <div className="text-xs text-sepia-700/80 font-mono">
                      {formatBBox(section.boundingBox)}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateOr(section.id, () => onDuplicateSection(section));
                    }}
                    className="p-1 hover:bg-gray-300 rounded opacity-0 group-hover:opacity-100"
                    title="Duplicate section"
                  >
                    <CopyPlus className="w-4 h-4" />
                  </button>
                  <LockButton
                    id={section.id}
                    directlyLocked={lockedIds.has(section.id)}
                    effectivelyLocked={effectivelyLockedIds.has(section.id)}
                    onToggle={onToggleLock}
                  />
                </div>

                {/* Pairs */}
                {expandedSections.has(section.id) && (
                  <div className="ml-6 space-y-1">
                    {section.pairAnnotations?.map((pair, pairIndex) => (
                      <div key={pair.id}>
                        {/* Pair */}
                        <div
                          className={`group flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                            isSelected(pair.id)
                              ? 'bg-[#5a7a3a]/10 text-ink-900 border border-[#5a7a3a]/40'
                              : 'hover:bg-parchment-100 text-ink-900/80 border border-transparent'
                          } ${lockedRowClass(pair.id)}`}
                          onClick={(e) =>
                            onSelectAnnotation(
                              { id: pair.id, type: 'pair', data: pair },
                              e.metaKey || e.ctrlKey || e.shiftKey
                            )
                          }
                          onContextMenu={(e) =>
                            handleContextMenu(e, 'pair', pair.id)
                          }
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePair(pair.id);
                            }}
                            className="p-0.5 hover:bg-gray-300 rounded"
                          >
                            {expandedPairs.has(pair.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#5a7a3a' }} />

                          <div className="flex-1 min-w-0">
                            <div className="truncate font-semibold">
                              Pair {pairIndex + 1}
                            </div>
                            <div className="text-xs text-sepia-700/80 font-mono">
                              {formatBBox(pair.boundingBox)}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateOr(pair.id, () => onDuplicatePair(pair, section.id));
                            }}
                            className="p-1 hover:bg-gray-300 rounded opacity-0 group-hover:opacity-100"
                            title="Duplicate pair"
                          >
                            <CopyPlus className="w-4 h-4" />
                          </button>
                          <LockButton
                            id={pair.id}
                            directlyLocked={lockedIds.has(pair.id)}
                            effectivelyLocked={effectivelyLockedIds.has(pair.id)}
                            onToggle={onToggleLock}
                          />
                        </div>

                        {/* Elements */}
                        {expandedPairs.has(pair.id) && (
                          <div className="ml-6 space-y-1">
                            {pair.elementAnnotations?.map((element, elementIndex) => (
                              <div
                                key={element.id}
                                className={`group flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                                  isSelected(element.id)
                                    ? 'bg-cipher-red/10 text-ink-900 border border-cipher-red/40'
                                    : 'hover:bg-parchment-100 text-ink-900/80 border border-transparent'
                                } ${lockedRowClass(element.id)}`}
                                onClick={(e) =>
                                  onSelectAnnotation(
                                    { id: element.id, type: 'element', data: element },
                                    e.metaKey || e.ctrlKey || e.shiftKey
                                  )
                                }
                                onContextMenu={(e) =>
                                  handleContextMenu(e, 'element', element.id)
                                }
                              >
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-cipher-red" />

                                <div className="flex-1 min-w-0">
                                  <div className="truncate font-semibold">
                                    Element {elementIndex + 1} ({element.type})
                                  </div>
                                  <div className="text-xs text-sepia-700/80 font-mono">
                                    {formatBBox(element.boundingBox)}
                                  </div>
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateOr(element.id, () => onDuplicateElement(element, pair.id));
                                  }}
                                  className="p-1 hover:bg-gray-300 rounded opacity-0 group-hover:opacity-100"
                                  title="Duplicate element"
                                >
                                  <CopyPlus className="w-4 h-4" />
                                </button>
                                <LockButton
                                  id={element.id}
                                  directlyLocked={lockedIds.has(element.id)}
                                  effectivelyLocked={effectivelyLockedIds.has(element.id)}
                                  onToggle={onToggleLock}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-parchment-50 border border-sepia-600/30 rounded-md shadow-lg z-50"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            onClick={() => {
              const bbox =
                contextMenu.type === 'section'
                  ? sections.find((s) => s.id === contextMenu.id)?.boundingBox
                  : undefined;
              if (bbox) handleCopyBBox(bbox);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-ink-900 hover:bg-parchment-100 w-full text-left"
          >
            <Copy className="w-4 h-4" />
            Copy BBox
          </button>

          <button
            onClick={() =>
              handleDelete(contextMenu.type, contextMenu.id)
            }
            className="flex items-center gap-2 px-4 py-2 text-sm text-cipher-red hover:bg-cipher-red/10 w-full text-left"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default AnnotationTreePanel;
