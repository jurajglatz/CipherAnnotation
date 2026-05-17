/**
 * CaptionsPanel Component
 * Manages document-scoped captions: add, rename, delete, and shows page-scoped usage.
 * Also shows a fixed list of annotation types with per-page counts.
 */

import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import { Annotation, AnnotationType, Caption } from '@/types';
import { captionColor } from './utils/captionColor';

interface CaptionsPanelProps {
  /** Document-wide captions (with document-wide usageCount). */
  captions: Caption[];
  /** Annotations on the current page only — used for the per-page count display. */
  annotations: Annotation[];
  onAdd: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Select all annotations on the current page that use this caption. */
  onSelectByCaption?: (captionId: string) => void;
  /** Captions whose annotations are hidden from the canvas. */
  hiddenCaptionIds?: Set<string>;
  /** Toggle visibility of all annotations using this caption. */
  onToggleCaptionVisibility?: (captionId: string) => void;
  /** Select all annotations on the current page that have this type. */
  onSelectByType?: (type: AnnotationType) => void;
  /** Annotation types whose annotations are hidden from the canvas. */
  hiddenTypes?: Set<string>;
  /** Toggle visibility of all annotations of this type. */
  onToggleTypeVisibility?: (type: AnnotationType) => void;
  /** When true, disables add/rename/delete (used for read-only shares). */
  readOnly?: boolean;
}

const ANNOTATION_TYPES: AnnotationType[] = ['Text', 'Cipher', 'Symbol'];

export const CaptionsPanel: React.FC<CaptionsPanelProps> = ({
  captions,
  annotations,
  onAdd,
  onRename,
  onDelete,
  onSelectByCaption,
  hiddenCaptionIds,
  onToggleCaptionVisibility,
  onSelectByType,
  hiddenTypes,
  onToggleTypeVisibility,
  readOnly = false,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newDraft, setNewDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [captionsOpen, setCaptionsOpen] = useState(true);
  const [typesOpen, setTypesOpen] = useState(true);

  const pageCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of annotations) {
      m.set(a.captionId, (m.get(a.captionId) ?? 0) + 1);
    }
    return m;
  }, [annotations]);

  const typeCounts = useMemo(() => {
    const m = new Map<AnnotationType, number>();
    for (const a of annotations) {
      m.set(a.type, (m.get(a.type) ?? 0) + 1);
    }
    return m;
  }, [annotations]);

  const sortedCaptions = useMemo(
    () => [...captions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [captions]
  );

  function startAdd() {
    setIsAdding(true);
    setNewDraft('');
    setError(null);
  }

  async function commitAdd() {
    const name = newDraft.trim();
    if (!name) {
      setIsAdding(false);
      return;
    }
    try {
      await onAdd(name);
      setIsAdding(false);
      setNewDraft('');
      setError(null);
    } catch (e: unknown) {
      setError(extractMessage(e));
    }
  }

  async function handleRename(id: string) {
    const name = renameDraft.trim();
    if (!name) return;
    try {
      await onRename(id, name);
      setRenamingId(null);
      setError(null);
    } catch (e: unknown) {
      setError(extractMessage(e));
    }
  }

  async function handleDelete(c: Caption) {
    if (c.usageCount > 0) {
      setError(
        `Cannot delete "${c.name}" — ${c.usageCount} annotation(s) use it. Reassign or delete those first.`
      );
      return;
    }
    try {
      await onDelete(c.id);
      setError(null);
    } catch (e: unknown) {
      setError(extractMessage(e));
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Captions section */}
      <div className="border-b border-sepia-600/20">
        <div className="flex items-center gap-1 p-4">
          <button
            type="button"
            onClick={() => setCaptionsOpen((v) => !v)}
            className="flex items-center gap-1 flex-1 text-left"
          >
            {captionsOpen ? (
              <ChevronDown className="w-4 h-4 text-ink-900/70" />
            ) : (
              <ChevronRight className="w-4 h-4 text-ink-900/70" />
            )}
            <h2 className="font-serif text-xl font-semibold text-ink-900">Captions</h2>
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={() => {
                if (!captionsOpen) setCaptionsOpen(true);
                startAdd();
              }}
              className="p-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors"
              title="Add caption"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {captionsOpen && (
          <div className="overflow-y-auto p-2 pt-0 max-h-[40vh]">
            {sortedCaptions.length === 0 && !isAdding ? (
              <div className="text-center py-8">
                <p className="text-sm text-ink-900/60 font-serif italic">No captions yet</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {isAdding && (
                  <li className="flex items-center gap-2 p-2 rounded text-sm border border-transparent">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: captionColor(newDraft || ' ') }}
                    />
                    <input
                      autoFocus
                      type="text"
                      value={newDraft}
                      onChange={(e) => setNewDraft(e.target.value)}
                      onBlur={commitAdd}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitAdd();
                        if (e.key === 'Escape') {
                          setIsAdding(false);
                          setNewDraft('');
                        }
                      }}
                      placeholder="Label…"
                      className="flex-1 px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
                    />
                  </li>
                )}
                {sortedCaptions.map((c) => {
                  const isRenaming = renamingId === c.id;
                  const pageCount = pageCounts.get(c.id) ?? 0;
                  const isHidden = hiddenCaptionIds?.has(c.id) ?? false;
                  return (
                    <li
                      key={c.id}
                      onClick={() => {
                        if (!isRenaming) onSelectByCaption?.(c.id);
                      }}
                      className="group flex items-center gap-2 p-2 rounded text-sm hover:bg-parchment-100 border border-transparent cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: captionColor(c.name) }}
                      />
                      {isRenaming ? (
                        <>
                          <input
                            autoFocus
                            type="text"
                            value={renameDraft}
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(c.id);
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            className="flex-1 px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-ink-900 focus:outline-none focus:ring-1 focus:ring-ink-900"
                          />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRename(c.id); }}
                            className="p-1 hover:bg-parchment-200 rounded"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setRenamingId(null); }}
                            className="p-1 hover:bg-parchment-200 rounded"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="truncate font-semibold text-ink-900">{c.name}</div>
                            <div className="text-xs text-sepia-700/80 font-mono">
                              {pageCount} on page · {c.usageCount} total
                            </div>
                          </div>
                          {onToggleCaptionVisibility && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCaptionVisibility(c.id);
                              }}
                              className={`p-1 hover:bg-parchment-200 rounded ${
                                isHidden ? 'opacity-100 text-ink-900/60' : 'opacity-0 group-hover:opacity-100'
                              }`}
                              title={isHidden ? 'Show annotations' : 'Hide annotations'}
                            >
                              {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          )}
                          {!readOnly && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenamingId(c.id);
                                  setRenameDraft(c.name);
                                }}
                                className="p-1 hover:bg-parchment-200 rounded opacity-0 group-hover:opacity-100"
                                title="Rename"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                                disabled={c.usageCount > 0}
                                className={`p-1 rounded opacity-0 group-hover:opacity-100 ${
                                  c.usageCount > 0
                                    ? 'cursor-not-allowed text-gray-400'
                                    : 'hover:bg-cipher-red/10 text-cipher-red'
                                }`}
                                title={c.usageCount > 0 ? 'In use — cannot delete' : 'Delete'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Types section */}
      <div className="border-b border-sepia-600/20">
        <div className="flex items-center gap-1 p-4">
          <button
            type="button"
            onClick={() => setTypesOpen((v) => !v)}
            className="flex items-center gap-1 flex-1 text-left"
          >
            {typesOpen ? (
              <ChevronDown className="w-4 h-4 text-ink-900/70" />
            ) : (
              <ChevronRight className="w-4 h-4 text-ink-900/70" />
            )}
            <h2 className="font-serif text-xl font-semibold text-ink-900">Types</h2>
          </button>
        </div>

        {typesOpen && (
          <div className="p-2 pt-0">
            <ul className="space-y-1">
              {ANNOTATION_TYPES.map((t) => {
                const count = typeCounts.get(t) ?? 0;
                const isHidden = hiddenTypes?.has(t) ?? false;
                return (
                  <li
                    key={t}
                    onClick={() => onSelectByType?.(t)}
                    className="group flex items-center gap-2 p-2 rounded text-sm hover:bg-parchment-100 border border-transparent cursor-pointer"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: captionColor(t) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold text-ink-900">{t}</div>
                      <div className="text-xs text-sepia-700/80 font-mono">
                        {count} on page
                      </div>
                    </div>
                    {onToggleTypeVisibility && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTypeVisibility(t);
                        }}
                        className={`p-1 hover:bg-parchment-200 rounded ${
                          isHidden ? 'opacity-100 text-ink-900/60' : 'opacity-0 group-hover:opacity-100'
                        }`}
                        title={isHidden ? 'Show annotations' : 'Hide annotations'}
                      >
                        {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 border-t border-sepia-600/20 text-sm text-cipher-red bg-cipher-red/5">
          {error}
        </div>
      )}
    </div>
  );
};

function extractMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const data = (e as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export default CaptionsPanel;
