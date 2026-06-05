/**
 * PreprocessPanel Component
 * Right-side panel for configuring image preprocessing in the annotation workspace.
 * Changes preview live on the canvas via CSS; only persisted to backend on Save.
 */

import React from 'react';
import { Settings, Save, RotateCcw, X, Undo2, Redo2, History } from 'lucide-react';

export interface PreprocessOperation {
  name: string;
  value?: number;
}

export interface PreprocessHistoryItem {
  id: string;
  sequence: number;
  operations: PreprocessOperation[];
  appliedAt: string;
  isCurrent: boolean;
}

export const PREPROCESS_OPS = [
  { id: 'binarize', label: 'Binarize', description: 'Convert to black & white', hasParam: false, cssOnly: true },
  { id: 'threshold', label: 'Threshold', description: 'Binary threshold level', hasParam: true, min: 0, max: 1, step: 0.05, defaultValue: 0.5, unit: '', cssOnly: true },
  { id: 'contrast', label: 'Contrast', description: 'Adjust contrast intensity', hasParam: true, min: 0.1, max: 3, step: 0.1, defaultValue: 1.5, unit: 'x', cssOnly: true },
  { id: 'rotate', label: 'Rotate', description: 'Rotate by angle', hasParam: true, min: 0, max: 360, step: 1, defaultValue: 90, unit: '°', cssOnly: true },
  { id: 'denoise', label: 'Denoise', description: 'Reduce image noise', hasParam: false, cssOnly: false },
  { id: 'scale', label: 'Scale', description: 'Resize image', hasParam: true, min: 0.1, max: 4, step: 0.1, defaultValue: 1.5, unit: 'x', cssOnly: true },
  { id: 'grayscale', label: 'Grayscale', description: 'Convert to grayscale', hasParam: false, cssOnly: true },
] as const;

interface PreprocessPanelProps {
  operations: PreprocessOperation[];
  onOperationsChange: (ops: PreprocessOperation[]) => void;
  onSave: () => void;
  onReset: () => void;
  onClose: () => void;
  isSaving: boolean;
  isResetting: boolean;
  /** Backend preprocess-history undo — independent of the annotation history. */
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isHistoryBusy?: boolean;
  /** Persisted preprocess batches for this page, ordered oldest → newest. */
  history?: PreprocessHistoryItem[];
}

export const PreprocessPanel: React.FC<PreprocessPanelProps> = ({
  operations,
  onOperationsChange,
  onSave,
  onReset,
  onClose,
  isSaving,
  isResetting,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isHistoryBusy = false,
  history = [],
}) => {
  const opLabel = (op: PreprocessOperation) => {
    const def = PREPROCESS_OPS.find((d) => d.id === op.name);
    const base = def?.label ?? op.name;
    if (def?.hasParam && op.value !== undefined) return `${base} ${op.value}${def.unit ?? ''}`;
    return base;
  };
  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };
  const toggleOperation = (opId: string) => {
    const exists = operations.find((o) => o.name === opId);
    if (exists) {
      onOperationsChange(operations.filter((o) => o.name !== opId));
      return;
    }
    const def = PREPROCESS_OPS.find((o) => o.id === opId);
    const newOp: PreprocessOperation = { name: opId };
    if (def?.hasParam) newOp.value = def.defaultValue;
    onOperationsChange([...operations, newOp]);
  };

  const updateOperationValue = (opName: string, value: number) => {
    onOperationsChange(
      operations.map((o) => (o.name === opName ? { ...o, value } : o))
    );
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl font-semibold text-ink-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-sepia-700" />
          Preprocessing
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-parchment-100 rounded-md transition-colors"
          title="Close preprocessing"
        >
          <X className="w-4 h-4 text-ink-900" />
        </button>
      </div>

      <p className="text-xs text-ink-900/60 italic">
        Changes preview live on the canvas. Click Save Changes to persist.
      </p>

      <div>
        <h3 className="text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
          Operations
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {PREPROCESS_OPS.map((op) => {
            const isActive = operations.some((o) => o.name === op.id);
            return (
              <button
                key={op.id}
                onClick={() => toggleOperation(op.id)}
                className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors border ${
                  isActive
                    ? 'bg-sepia-700 text-parchment-50 border-sepia-700'
                    : 'bg-transparent text-ink-900 border-sepia-600/30 hover:border-ink-900/60'
                }`}
                title={op.description}
              >
                {op.label}
              </button>
            );
          })}
        </div>
      </div>

      {operations.length > 0 && (
        <div className="space-y-3">
          {operations.map((op) => {
            const def = PREPROCESS_OPS.find((d) => d.id === op.name);
            if (!def) return null;
            return (
              <div
                key={op.name}
                className="bg-parchment-100/60 border border-sepia-600/20 rounded-md p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-ink-900">{def.label}</span>
                  {def.hasParam && (
                    <span className="text-sm font-mono font-semibold text-sepia-700 tabular-nums">
                      {op.value}{def.unit}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-900/60 mb-2 italic">{def.description}</p>
                {def.hasParam && (
                  <>
                    <input
                      type="range"
                      min={def.min}
                      max={def.max}
                      step={def.step}
                      value={op.value ?? def.defaultValue}
                      onChange={(e) => updateOperationValue(op.name, parseFloat(e.target.value))}
                      className="w-full h-2 bg-parchment-200 rounded-lg appearance-none cursor-pointer accent-ink-900"
                    />
                    <div className="flex justify-between text-xs text-sepia-700/70 mt-1">
                      <span>{def.min}{def.unit}</span>
                      <span>{def.max}{def.unit}</span>
                    </div>
                  </>
                )}
                {!def.cssOnly && (
                  <p className="text-[11px] text-sepia-700 mt-1 font-medium">
                    Applied on save (no live preview)
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(onUndo || onRedo) && (
        <div className="pt-3 border-t border-sepia-600/20">
          <h3 className="text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2">
            Saved History
          </h3>
          <p className="text-[11px] text-ink-900/60 italic mb-2">
            Step through previously saved preprocess batches (independent of annotation undo/redo).
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onUndo}
              disabled={!canUndo || isHistoryBusy || isSaving || isResetting}
              className="px-3 py-2 bg-transparent text-ink-900 border-2 border-ink-900/20 hover:border-ink-900/60 rounded-md transition-colors font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              title="Undo last saved preprocess batch"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo || isHistoryBusy || isSaving || isResetting}
              className="px-3 py-2 bg-transparent text-ink-900 border-2 border-ink-900/20 hover:border-ink-900/60 rounded-md transition-colors font-semibold text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              title="Redo previously undone preprocess batch"
            >
              <Redo2 className="w-3.5 h-3.5" />
              Redo
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-3 border-t border-sepia-600/20">
        <button
          onClick={onSave}
          disabled={isSaving || isResetting || isHistoryBusy || operations.length === 0}
          className="w-full px-4 py-2.5 bg-ink-900 hover:bg-primary-700 text-parchment-50 rounded-md transition-colors font-semibold shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-parchment-50 border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
        <button
          onClick={onReset}
          disabled={isSaving || isResetting || isHistoryBusy}
          className="w-full px-4 py-2 bg-transparent hover:bg-cipher-red/5 text-cipher-red border-2 border-cipher-red/30 hover:border-cipher-red/60 rounded-md transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isResetting ? (
            <>
              <div className="w-4 h-4 border-2 border-cipher-red border-t-transparent rounded-full animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <RotateCcw className="w-4 h-4" />
              Reset to Original
            </>
          )}
        </button>
      </div>

      <div className="pt-3 border-t border-sepia-600/20">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-sepia-700 mb-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          Applied Edits
        </h3>
        {history.length === 0 ? (
          <p className="text-[11px] text-ink-900/50 italic">
            No preprocess batches saved yet for this page.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {[...history].reverse().map((entry) => (
              <li
                key={entry.id}
                className={`rounded-md border px-2.5 py-1.5 text-xs ${
                  entry.isCurrent
                    ? 'bg-sepia-700/10 border-sepia-700/50 text-ink-900'
                    : 'bg-transparent border-sepia-600/20 text-ink-900/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold tabular-nums">
                    #{entry.sequence}
                  </span>
                  <span className="text-[10px] text-ink-900/50 tabular-nums">
                    {formatTime(entry.appliedAt)}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {entry.operations.length === 0 ? (
                    <span className="italic text-ink-900/50">(empty)</span>
                  ) : (
                    entry.operations.map((op, i) => (
                      <span
                        key={`${entry.id}-${i}`}
                        className="inline-block px-1.5 py-0.5 rounded bg-parchment-100 border border-sepia-600/20 text-[10px] font-medium"
                      >
                        {opLabel(op)}
                      </span>
                    ))
                  )}
                </div>
                {entry.isCurrent && (
                  <div className="mt-1 text-[10px] font-semibold text-sepia-700 uppercase tracking-wider">
                    Current
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

/**
 * Build CSS filter + transform strings for a list of operations.
 * Used by AnnotationCanvas to render a live preview of preprocessing.
 */
export function buildPreprocessCss(operations: PreprocessOperation[]): {
  filter: string;
  transform: string;
} {
  const filters: string[] = [];
  const transforms: string[] = [];

  for (const op of operations) {
    switch (op.name) {
      case 'grayscale':
        filters.push('grayscale(1)');
        break;
      case 'binarize':
        filters.push('grayscale(1) contrast(1000%)');
        break;
      case 'threshold': {
        const v = op.value ?? 0.5;
        // lower v -> more black, higher v -> more white
        filters.push(`grayscale(1) brightness(${(1 - v) * 2}) contrast(1000%)`);
        break;
      }
      case 'contrast':
        filters.push(`contrast(${op.value ?? 1.5})`);
        break;
      case 'denoise':
        filters.push('blur(0.6px)');
        break;
      case 'rotate':
        transforms.push(`rotate(${op.value ?? 0}deg)`);
        break;
      case 'scale':
        transforms.push(`scale(${op.value ?? 1})`);
        break;
    }
  }

  return {
    filter: filters.join(' '),
    transform: transforms.join(' '),
  };
}

export default PreprocessPanel;
