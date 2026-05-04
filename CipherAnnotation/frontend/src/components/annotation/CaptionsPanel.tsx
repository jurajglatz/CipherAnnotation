/**
 * CaptionsPanel Component
 * Manages document-scoped captions: add, rename, delete, and shows page-scoped usage.
 */

import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Annotation, Caption } from '@/types';
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
}

export const CaptionsPanel: React.FC<CaptionsPanelProps> = ({
  captions,
  annotations,
  onAdd,
  onRename,
  onDelete,
  onSelectByCaption,
}) => {
  const [draftName, setDraftName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pageCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of annotations) {
      m.set(a.captionId, (m.get(a.captionId) ?? 0) + 1);
    }
    return m;
  }, [annotations]);

  const sortedCaptions = useMemo(
    () => [...captions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [captions]
  );

  async function handleAdd() {
    const name = draftName.trim();
    if (!name) return;
    try {
      await onAdd(name);
      setDraftName('');
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
      {/* Header */}
      <div className="p-4 border-b border-sepia-600/20">
        <h2 className="font-serif text-xl font-semibold text-ink-900 mb-3">Captions</h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="Add caption…"
            className="flex-1 px-3 py-2 text-sm bg-parchment-50 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/60 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
          />
          <button
            type="button"
            onClick={handleAdd}
            className="p-2 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors"
            title="Add caption"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sortedCaptions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-ink-900/60 font-serif italic">No captions yet</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {sortedCaptions.map((c) => {
              const isRenaming = renamingId === c.id;
              const pageCount = pageCounts.get(c.id) ?? 0;
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
                </li>
              );
            })}
          </ul>
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
