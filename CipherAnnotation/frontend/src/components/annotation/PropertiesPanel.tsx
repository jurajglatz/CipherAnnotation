/**
 * PropertiesPanel Component
 * Right sidebar showing properties of a selected annotation.
 * Single form gated by `annotation.type` (Text / Cipher / Symbol).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import {
  Annotation,
  AnnotationType,
  Caption,
  DocumentAnnotationRef,
  SymbolSuggestion,
} from '@/types';
import annotationService from '@/services/annotationService';
import symbolService from '@/services/symbolService';
import SymbolWhiteboard from './SymbolWhiteboard';
import SymbolImage from './SymbolImage';

interface PropertiesPanelProps {
  annotation: Annotation | null;
  captions: Caption[];
  documentId: string;
  onUpdate: (id: string, data: Partial<Omit<Annotation, 'id'>>) => Promise<void>;
  onDelete: (id: string) => void;
  /** When true, all inputs and action buttons are disabled. */
  readOnly?: boolean;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  annotation,
  captions,
  documentId,
  onUpdate,
  onDelete,
  readOnly = false,
}) => {
  const [draft, setDraft] = useState<Annotation | null>(annotation);
  const [textRefs, setTextRefs] = useState<DocumentAnnotationRef[]>([]);
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([]);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardBusy, setWhiteboardBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSavedRef = useRef<Annotation | null>(annotation);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(annotation);
    lastSavedRef.current = annotation;
    setError(null);
    setShowWhiteboard(false);
  }, [annotation?.id]);

  // Symbol suggestions — debounced lookup keyed off the editable Content field.
  useEffect(() => {
    if (!draft || draft.type !== 'Symbol') {
      setSuggestions([]);
      return;
    }
    if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
    const content = draft.content ?? '';
    suggestionDebounceRef.current = setTimeout(() => {
      symbolService
        .getSuggestions(content, 6)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 250);
    return () => {
      if (suggestionDebounceRef.current) clearTimeout(suggestionDebounceRef.current);
    };
  }, [draft?.type, draft?.content]);

  useEffect(() => {
    if (!annotation || annotation.type !== 'Symbol') {
      setTextRefs([]);
      return;
    }
    annotationService
      .listForDocument(documentId, {
        type: 'Text',
        currentPageId: annotation.pageId,
        // Only siblings under the same parent. A symbol at the root sees only
        // root-level Text annotations.
        parentId: annotation.parentId ?? undefined,
        rootOnly: annotation.parentId == null,
      })
      .then(setTextRefs)
      .catch(() => setTextRefs([]));
  }, [annotation?.type, annotation?.pageId, annotation?.parentId, documentId]);

  useEffect(() => {
    if (readOnly || !draft) return;
    const last = lastSavedRef.current;
    if (!last || last.id !== draft.id) return;
    if (annotationsEqual(last, draft)) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const current = draft;
      const payload: Partial<Omit<Annotation, 'id'>> = {
        captionId: current.captionId,
        type: current.type,
        content: current.content,
        transcription: current.type === 'Cipher' ? current.transcription : undefined,
        transcriptionRefId:
          current.type === 'Symbol' ? current.transcriptionRefId ?? null : null,
        symbolId:
          current.type === 'Symbol' ? current.symbolId ?? null : null,
        orientation: current.orientation,
        boundingBox: current.boundingBox,
      };
      lastSavedRef.current = current;
      onUpdate(current.id, payload)
        .then(() => setError(null))
        .catch((e: unknown) => {
          setError(extractMessage(e));
          lastSavedRef.current = last;
        });
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft, readOnly, onUpdate]);

  if (!draft || !annotation) {
    return (
      <div className="p-4 h-full flex items-center justify-center text-center">
        <p className="font-serif italic text-ink-900/60 text-sm">
          Select an annotation to view and edit properties
        </p>
      </div>
    );
  }

  function setField<K extends keyof Annotation>(key: K, value: Annotation[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function setBBoxField(key: keyof Annotation['boundingBox'], value: number) {
    setDraft((d) =>
      d ? { ...d, boundingBox: { ...d.boundingBox, [key]: value } } : d
    );
  }

  const sortedCaptions = [...captions].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-sepia-600/20">
        <h3 className="font-serif text-xl font-semibold text-ink-900">
          {draft.captionName} {draft.captionNumber}{' '}
          <em className="italic font-normal text-sepia-700">Properties</em>
        </h3>
      </div>

      {/* Content */}
      <fieldset
        disabled={readOnly}
        className="flex-1 overflow-y-auto p-4 space-y-4 disabled:opacity-70 border-0 m-0 min-w-0"
      >
        {/* Caption */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
            Caption
          </label>
          <select
            value={draft.captionId}
            onChange={(e) => setField('captionId', e.target.value)}
            className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
          >
            {sortedCaptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
            Type
          </label>
          <select
            value={draft.type}
            onChange={(e) => setField('type', e.target.value as AnnotationType)}
            className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
          >
            <option value="Text">Text</option>
            <option value="Cipher">Cipher</option>
            <option value="Symbol">Symbol</option>
          </select>
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
            Content
          </label>
          <textarea
            value={draft.content ?? ''}
            onChange={(e) => setField('content', e.target.value)}
            rows={2}
            placeholder="Annotation content"
            className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900 resize-none"
          />
        </div>

        {/* Cipher-specific: transcription */}
        {draft.type === 'Cipher' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
              Transcription
            </label>
            <textarea
              value={draft.transcription ?? ''}
              onChange={(e) => setField('transcription', e.target.value)}
              rows={2}
              placeholder="Cipher transcription"
              className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900 resize-none"
            />
          </div>
        )}

        {/* Symbol-specific: transcription ref */}
        {draft.type === 'Symbol' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
              Transcription (Text annotation)
            </label>
            <select
              value={draft.transcriptionRefId ?? ''}
              onChange={(e) =>
                setField(
                  'transcriptionRefId',
                  e.target.value ? e.target.value : null
                )
              }
              className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
            >
              <option value="">(none)</option>
              {textRefs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.captionLabel} {r.captionNumber} • p.{r.pageNumber} •{' '}
                  {r.content ?? '(no content)'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Symbol-specific: canonical Symbol entity (drawing + suggestions) */}
        {draft.type === 'Symbol' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700">
              Symbol drawing
            </label>

            {draft.symbolId ? (
              <div className="flex items-center gap-3 p-2 border border-sepia-600/30 rounded-md bg-parchment-50">
                <SymbolImage
                  symbolId={draft.symbolId}
                  alt="Linked symbol"
                  className="w-16 h-16 object-contain bg-white rounded border border-sepia-600/20"
                />
                <div className="flex-1 text-xs font-mono text-ink-900/70 truncate">
                  {draft.symbolId}
                </div>
                <button
                  type="button"
                  onClick={() => setField('symbolId', null)}
                  className="p-1 text-cipher-red hover:bg-cipher-red/10 rounded"
                  title="Unlink symbol"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : showWhiteboard ? (
              <SymbolWhiteboard
                busy={whiteboardBusy}
                onCancel={() => setShowWhiteboard(false)}
                onSave={async (blob) => {
                  setWhiteboardBusy(true);
                  try {
                    const created = await symbolService.create(blob, draft.content ?? null);
                    setField('symbolId', created.id);
                    setShowWhiteboard(false);
                  } catch (e) {
                    setError(extractMessage(e));
                  } finally {
                    setWhiteboardBusy(false);
                  }
                }}
              />
            ) : (
              <>
                {suggestions.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setField('symbolId', s.id)}
                        className="p-1 border border-sepia-600/30 rounded hover:border-ink-900 bg-white"
                        title={s.content ?? ''}
                      >
                        <SymbolImage
                          symbolId={s.id}
                          alt={s.content ?? 'symbol'}
                          className="w-full h-12 object-contain"
                        />
                        {s.content && (
                          <div className="text-xs truncate text-ink-900/70 mt-1">
                            {s.content}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowWhiteboard(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-sepia-600/30 rounded-md text-sm text-ink-900 hover:bg-parchment-50"
                >
                  <Pencil className="w-4 h-4" /> Draw new symbol
                </button>
              </>
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
              step="0.1"
              value={draft.orientation}
              onChange={(e) =>
                setField('orientation', parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
            />
            <select
              value={
                [0, 45, 90, 135, 180, 225, 270, 315].includes(draft.orientation)
                  ? draft.orientation
                  : ''
              }
              onChange={(e) => setField('orientation', Number(e.target.value))}
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
            {(['x', 'y', 'width', 'height'] as const).map((k) => (
              <div key={k}>
                <label className="text-xs text-sepia-700/80 font-mono">
                  {k === 'width' ? 'w' : k === 'height' ? 'h' : k}
                </label>
                <input
                  type="number"
                  value={draft.boundingBox[k]}
                  onChange={(e) => setBBoxField(k, Number(e.target.value))}
                  className="w-full px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-sm text-ink-900 font-mono focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Created */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
            Created
          </label>
          <p className="text-sm text-ink-900 font-serif">
            {new Date(draft.createdAt).toLocaleString()}
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-cipher-red bg-cipher-red/5 border border-cipher-red/20 rounded">
            {error}
          </div>
        )}
      </fieldset>

      {/* Actions */}
      {!readOnly && (
        <div className="border-t border-sepia-600/20 p-4">
          <button
            onClick={() => onDelete(annotation.id)}
            className="w-full flex items-center justify-center gap-2 border border-cipher-red/40 text-cipher-red hover:bg-cipher-red/10 py-2.5 rounded-md font-medium transition-all"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

function annotationsEqual(a: Annotation, b: Annotation): boolean {
  return (
    a.captionId === b.captionId &&
    a.type === b.type &&
    a.content === b.content &&
    a.transcription === b.transcription &&
    a.transcriptionRefId === b.transcriptionRefId &&
    a.symbolId === b.symbolId &&
    a.orientation === b.orientation &&
    a.boundingBox.x === b.boundingBox.x &&
    a.boundingBox.y === b.boundingBox.y &&
    a.boundingBox.width === b.boundingBox.width &&
    a.boundingBox.height === b.boundingBox.height
  );
}

function extractMessage(e: unknown): string {
  if (typeof e === 'object' && e !== null && 'response' in e) {
    const data = (e as { response?: { data?: { message?: string } } }).response?.data;
    if (data?.message) return data.message;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export default PropertiesPanel;
