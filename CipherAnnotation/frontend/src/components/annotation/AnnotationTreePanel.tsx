/**
 * AnnotationTreePanel Component
 * Left sidebar showing annotation hierarchy as a recursive tree.
 * Renderer is type-agnostic — caption/colour drives the visual,
 * type icon distinguishes Text/Cipher/Symbol annotations.
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Search,
  CopyPlus,
  ChevronsDownUp,
  ChevronsUpDown,
  Lock,
  LockOpen,
} from 'lucide-react';
import { Annotation } from '@/types';
import { Tooltip } from '@/components/shared';
import { captionColor } from './utils/captionColor';

interface AnnotationTreePanelProps {
  rootIds: string[];
  byId: Map<string, Annotation>;
  childrenByParent: Map<string | null, Annotation[]>;
  selectedIds: Set<string>;
  onSelect: (id: string, opts?: { toggle?: boolean }) => void;
  onDelete: (id: string) => void;
  /** Optional: duplicate a single annotation (and its descendants). */
  onDuplicate?: (id: string) => void;
  /** Optional: duplicate the whole multi-selection. */
  onDuplicateSelected?: () => void;
  /** Optional: locking (directly locked + effectively locked sets). */
  lockedIds?: Set<string>;
  effectivelyLockedIds?: Set<string>;
  onToggleLock?: (id: string) => void;
  /** When true, hides delete/duplicate buttons (used for read-only shares). */
  readOnly?: boolean;
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

const formatBBox = (bbox: { x: number; y: number; width: number; height: number }) =>
  `(${Math.round(bbox.x)}, ${Math.round(bbox.y)}, ${Math.round(bbox.width)}, ${Math.round(bbox.height)})`;

const typeIcon = (t: Annotation['type']): string =>
  t === 'Text' ? 'T' : t === 'Cipher' ? 'C' : 'S';

export const AnnotationTreePanel: React.FC<AnnotationTreePanelProps> = ({
  rootIds,
  byId,
  childrenByParent,
  selectedIds,
  onSelect,
  onDelete,
  onDuplicate,
  onDuplicateSelected,
  lockedIds,
  effectivelyLockedIds,
  onToggleLock,
  readOnly = false,
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const isExpanded = (id: string) => expanded.has(id);
  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allIds = useMemo(() => Array.from(byId.keys()), [byId]);

  const expandAll = () => setExpanded(new Set(allIds));
  const collapseAll = () => setExpanded(new Set());

  // Duplicate-or-multi: if `id` is part of a >1 multi-selection, duplicate group
  const handleDuplicate = (id: string) => {
    if (!onDuplicate) return;
    if (selectedIds.size > 1 && selectedIds.has(id) && onDuplicateSelected) {
      onDuplicateSelected();
    } else {
      onDuplicate(id);
    }
  };

  // Filter: show roots whose subtree contains a matching annotation
  const matchesQuery = (a: Annotation): boolean => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      a.captionName.toLowerCase().includes(q) ||
      String(a.captionNumber).includes(q) ||
      (a.content ?? '').toLowerCase().includes(q) ||
      a.id.includes(q)
    );
  };

  const subtreeMatches = (id: string): boolean => {
    const a = byId.get(id);
    if (!a) return false;
    if (matchesQuery(a)) return true;
    const kids = childrenByParent.get(id) ?? [];
    return kids.some((c) => subtreeMatches(c.id));
  };

  const filteredRootIds = searchQuery.trim()
    ? rootIds.filter((id) => subtreeMatches(id))
    : rootIds;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sepia-600/20">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-xl font-semibold text-ink-900">Annotations</h2>
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
        {filteredRootIds.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-ink-900/60 font-serif italic">No annotations yet</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredRootIds.map((id) => {
              const a = byId.get(id);
              if (!a) return null;
              return (
                <AnnotationRow
                  key={id}
                  ann={a}
                  depth={0}
                  byId={byId}
                  childrenByParent={childrenByParent}
                  selectedIds={selectedIds}
                  expanded={expanded}
                  onToggleExpanded={toggleExpanded}
                  isExpanded={isExpanded}
                  onSelect={onSelect}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate ? handleDuplicate : undefined}
                  lockedIds={lockedIds}
                  effectivelyLockedIds={effectivelyLockedIds}
                  onToggleLock={onToggleLock}
                  readOnly={readOnly}
                />
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

interface RowProps {
  ann: Annotation;
  depth: number;
  byId: Map<string, Annotation>;
  childrenByParent: Map<string | null, Annotation[]>;
  selectedIds: Set<string>;
  expanded: Set<string>;
  isExpanded: (id: string) => boolean;
  onToggleExpanded: (id: string) => void;
  onSelect: (id: string, opts?: { toggle?: boolean }) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  lockedIds?: Set<string>;
  effectivelyLockedIds?: Set<string>;
  onToggleLock?: (id: string) => void;
  readOnly?: boolean;
}

const AnnotationRow: React.FC<RowProps> = ({
  ann,
  depth,
  byId,
  childrenByParent,
  selectedIds,
  expanded,
  isExpanded,
  onToggleExpanded,
  onSelect,
  onDelete,
  onDuplicate,
  lockedIds,
  effectivelyLockedIds,
  onToggleLock,
  readOnly = false,
}) => {
  const children = childrenByParent.get(ann.id) ?? [];
  const isSelected = selectedIds.has(ann.id);
  const directlyLocked = lockedIds?.has(ann.id) ?? false;
  const effectivelyLocked = effectivelyLockedIds?.has(ann.id) ?? false;
  const lockedRowClass = effectivelyLocked ? 'opacity-60 italic' : '';
  const dotColor = captionColor(ann.captionName);

  return (
    <li>
      <div
        className={`group flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
          isSelected
            ? 'bg-primary-700/10 text-ink-900 border border-primary-700/30'
            : 'hover:bg-parchment-100 text-ink-900/80 border border-transparent'
        } ${lockedRowClass}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        onClick={(e) =>
          onSelect(ann.id, { toggle: e.metaKey || e.ctrlKey || e.shiftKey })
        }
      >
        {children.length > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(ann.id);
            }}
            className="p-0.5 hover:bg-gray-300 rounded"
          >
            {isExpanded(ann.id) ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />

        <div className="flex-1 min-w-0">
          <div className="truncate font-semibold">
            {ann.captionName} {ann.captionNumber}
          </div>
          <div className="text-xs text-sepia-700/80 font-mono">
            {formatBBox(ann.boundingBox)}
          </div>
        </div>

        <span
          className="text-xs font-mono font-bold text-sepia-700 px-1.5 py-0.5 bg-parchment-100 rounded"
          title={ann.type}
        >
          {typeIcon(ann.type)}
        </span>

        {onDuplicate && !readOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(ann.id);
            }}
            className="p-1 hover:bg-gray-300 rounded opacity-0 group-hover:opacity-100"
            title="Duplicate annotation"
          >
            <CopyPlus className="w-4 h-4" />
          </button>
        )}

        {onToggleLock && !readOnly && (
          <LockButton
            id={ann.id}
            directlyLocked={directlyLocked}
            effectivelyLocked={effectivelyLocked}
            onToggle={onToggleLock}
          />
        )}

        {!readOnly && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(ann.id);
            }}
            className="p-1 hover:bg-cipher-red/10 text-cipher-red rounded opacity-0 group-hover:opacity-100"
            title="Delete annotation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {children.length > 0 && isExpanded(ann.id) && (
        <ul className="space-y-1 mt-1">
          {children.map((c) => (
            <AnnotationRow
              key={c.id}
              ann={c}
              depth={depth + 1}
              byId={byId}
              childrenByParent={childrenByParent}
              selectedIds={selectedIds}
              expanded={expanded}
              isExpanded={isExpanded}
              onToggleExpanded={onToggleExpanded}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              lockedIds={lockedIds}
              effectivelyLockedIds={effectivelyLockedIds}
              onToggleLock={onToggleLock}
              readOnly={readOnly}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default AnnotationTreePanel;
