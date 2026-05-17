import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export interface HistoryCommand {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

export function useAnnotationHistory(resetKey: string | null | undefined) {
  const [history, setHistory] = useState<HistoryCommand[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyIndexRef = useRef(-1);
  useEffect(() => { historyIndexRef.current = historyIndex; }, [historyIndex]);
  const isReplayingRef = useRef(false);

  const batchingRef = useRef(false);
  const batchCommandsRef = useRef<HistoryCommand[]>([]);

  // Id remap across recreated annotations (so future undo/redo can target the right id).
  const idMap = useRef<Map<string, string>>(new Map());
  const resolveId = useCallback((id: string): string => {
    let current = id;
    const seen = new Set<string>();
    while (idMap.current.has(current) && !seen.has(current)) {
      seen.add(current);
      current = idMap.current.get(current)!;
    }
    return current;
  }, []);
  const remapId = useCallback((oldId: string, newId: string) => {
    if (oldId !== newId) idMap.current.set(oldId, newId);
  }, []);

  const pushCommand = useCallback((cmd: HistoryCommand) => {
    if (isReplayingRef.current) return;
    if (batchingRef.current) {
      batchCommandsRef.current.push(cmd);
      return;
    }
    setHistory((prev) => prev.slice(0, historyIndexRef.current + 1).concat(cmd));
    setHistoryIndex((i) => i + 1);
  }, []);

  const runInBatch = useCallback(async (fn: () => Promise<void>) => {
    if (batchingRef.current) { await fn(); return; }
    batchingRef.current = true;
    batchCommandsRef.current = [];
    try {
      await fn();
    } finally {
      const cmds = batchCommandsRef.current;
      batchingRef.current = false;
      batchCommandsRef.current = [];
      if (cmds.length === 1) {
        setHistory((prev) => prev.slice(0, historyIndexRef.current + 1).concat(cmds[0]));
        setHistoryIndex((i) => i + 1);
      } else if (cmds.length > 1) {
        const combined: HistoryCommand = {
          undo: async () => { for (let i = cmds.length - 1; i >= 0; i--) await cmds[i].undo(); },
          redo: async () => { for (const c of cmds) await c.redo(); },
        };
        setHistory((prev) => prev.slice(0, historyIndexRef.current + 1).concat(combined));
        setHistoryIndex((i) => i + 1);
      }
    }
  }, []);

  const handleUndo = useCallback(async () => {
    if (historyIndex < 0 || isReplayingRef.current) return;
    const cmd = history[historyIndex];
    if (!cmd) return;
    isReplayingRef.current = true;
    try {
      await cmd.undo();
      setHistoryIndex((i) => i - 1);
    } catch {
      toast.error('Undo failed');
    } finally {
      isReplayingRef.current = false;
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(async () => {
    if (historyIndex >= history.length - 1 || isReplayingRef.current) return;
    const cmd = history[historyIndex + 1];
    if (!cmd) return;
    isReplayingRef.current = true;
    try {
      await cmd.redo();
      setHistoryIndex((i) => i + 1);
    } catch {
      toast.error('Redo failed');
    } finally {
      isReplayingRef.current = false;
    }
  }, [history, historyIndex]);

  // Clear history when the bound resource changes (e.g. page navigation).
  useEffect(() => {
    setHistory([]);
    setHistoryIndex(-1);
    idMap.current.clear();
  }, [resetKey]);

  return {
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < history.length - 1,
    pushCommand,
    runInBatch,
    handleUndo,
    handleRedo,
    resolveId,
    remapId,
  };
}
