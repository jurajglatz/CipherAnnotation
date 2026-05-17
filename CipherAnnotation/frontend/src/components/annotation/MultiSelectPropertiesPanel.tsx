/**
 * MultiSelectPropertiesPanel
 * Right-sidebar panel shown when 2+ annotations are selected.
 * Currently supports bulk caption reassignment across mixed types.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Annotation, Caption } from '@/types';

interface MultiSelectPropertiesPanelProps {
  annotations: Annotation[];
  captions: Caption[];
  onBulkUpdateCaption: (ids: string[], captionId: string) => Promise<void>;
  readOnly?: boolean;
}

export const MultiSelectPropertiesPanel: React.FC<MultiSelectPropertiesPanelProps> = ({
  annotations,
  captions,
  onBulkUpdateCaption,
  readOnly = false,
}) => {
  const sortedCaptions = useMemo(
    () => [...captions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [captions]
  );

  const commonCaptionId = useMemo(() => {
    if (annotations.length === 0) return '';
    const first = annotations[0].captionId;
    return annotations.every((a) => a.captionId === first) ? first : '';
  }, [annotations]);

  const [captionId, setCaptionId] = useState<string>(commonCaptionId);
  const [error, setError] = useState<string | null>(null);
  const lastAppliedRef = useRef<string>(commonCaptionId);

  useEffect(() => {
    setCaptionId(commonCaptionId);
    lastAppliedRef.current = commonCaptionId;
    setError(null);
  }, [commonCaptionId, annotations.length]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of annotations) counts[a.type] = (counts[a.type] ?? 0) + 1;
    return counts;
  }, [annotations]);

  async function handleCaptionChange(newCaptionId: string) {
    setCaptionId(newCaptionId);
    if (!newCaptionId || newCaptionId === lastAppliedRef.current) return;
    const previous = lastAppliedRef.current;
    lastAppliedRef.current = newCaptionId;
    try {
      await onBulkUpdateCaption(annotations.map((a) => a.id), newCaptionId);
      setError(null);
    } catch (e: unknown) {
      setError(extractMessage(e));
      lastAppliedRef.current = previous;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sepia-600/20">
        <h3 className="font-serif text-xl font-semibold text-ink-900">
          {annotations.length} selected{' '}
          <em className="italic font-normal text-sepia-700">Properties</em>
        </h3>
        <p className="text-xs text-sepia-700 mt-1">
          {Object.entries(typeCounts)
            .map(([t, n]) => `${n} ${t}`)
            .join(' • ')}
        </p>
      </div>

      <fieldset
        disabled={readOnly}
        className="flex-1 overflow-y-auto p-4 space-y-4 disabled:opacity-70 border-0 m-0 min-w-0"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
            Caption
          </label>
          <select
            value={captionId}
            onChange={(e) => handleCaptionChange(e.target.value)}
            className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
          >
            {!commonCaptionId && (
              <option value="" disabled>
                (mixed — pick one to apply to all)
              </option>
            )}
            {sortedCaptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-sepia-700/80 mt-2 font-serif italic">
            Applying a caption updates all {annotations.length} selected annotations.
          </p>
        </div>

        {error && (
          <div className="p-3 text-sm text-cipher-red bg-cipher-red/5 border border-cipher-red/20 rounded">
            {error}
          </div>
        )}
      </fieldset>

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

export default MultiSelectPropertiesPanel;
