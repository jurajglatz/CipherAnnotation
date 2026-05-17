import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { pageService } from '@/services';
import { PreprocessHistoryEntry } from '@/types';
import { PreprocessOperation } from '@/components/annotation';

interface Args {
  documentId: string | undefined;
  pageId: string | undefined;
  pageCount: number;
  onPageRefetch: () => Promise<void> | void;
}

export function usePreprocess({ documentId, pageId, pageCount, onPageRefetch }: Args) {
  const [isOpen, setIsOpen] = useState(false);
  const [ops, setOps] = useState<PreprocessOperation[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isHistoryBusy, setIsHistoryBusy] = useState(false);
  const [history, setHistory] = useState<PreprocessHistoryEntry[]>([]);
  const [applyAllPrompt, setApplyAllPrompt] = useState<{
    ops: { name: string; value?: number }[];
  } | null>(null);
  const [isApplyingToAll, setIsApplyingToAll] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!documentId || !pageId) return;
    try {
      const state = await pageService.getPreprocessHistory(documentId, pageId);
      setHistory(state.entries);
    } catch {
      setHistory([]);
    }
  }, [documentId, pageId]);

  const save = async () => {
    if (!documentId || !pageId || ops.length === 0) return;
    try {
      setIsSaving(true);
      const opsPayload = ops.map((o) => ({
        name: o.name,
        ...(o.value !== undefined ? { value: o.value } : {}),
      }));
      await pageService.preprocessPage(documentId, pageId, opsPayload);
      toast.success('Preprocessing applied');
      setOps([]);
      await Promise.all([onPageRefetch(), fetchHistory()]);
      if (pageCount > 1) setApplyAllPrompt({ ops: opsPayload });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply preprocessing');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmApplyToAll = async () => {
    if (!documentId || !applyAllPrompt) return;
    try {
      setIsApplyingToAll(true);
      const result = await pageService.applyPreprocessToAllPages(documentId, applyAllPrompt.ops);
      if (result.failedCount > 0) {
        toast.error(`Applied to ${result.appliedCount} page(s), ${result.failedCount} failed`);
      } else {
        toast.success(`Applied to ${result.appliedCount} page(s)`);
      }
      setApplyAllPrompt(null);
      await Promise.all([onPageRefetch(), fetchHistory()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to apply to all pages');
    } finally {
      setIsApplyingToAll(false);
    }
  };

  const undo = async () => {
    if (!documentId || !pageId) return;
    try {
      setIsHistoryBusy(true);
      await pageService.undoPreprocess(documentId, pageId);
      setOps([]);
      await Promise.all([onPageRefetch(), fetchHistory()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to undo');
    } finally {
      setIsHistoryBusy(false);
    }
  };

  const redo = async () => {
    if (!documentId || !pageId) return;
    try {
      setIsHistoryBusy(true);
      await pageService.redoPreprocess(documentId, pageId);
      setOps([]);
      await Promise.all([onPageRefetch(), fetchHistory()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to redo');
    } finally {
      setIsHistoryBusy(false);
    }
  };

  const reset = async () => {
    if (!documentId || !pageId) return;
    try {
      setIsResetting(true);
      await pageService.resetPreprocessing(documentId, pageId);
      toast.success('Preprocessing reset');
      setOps([]);
      await Promise.all([onPageRefetch(), fetchHistory()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset preprocessing');
    } finally {
      setIsResetting(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setOps([]);
  };

  const open = () => {
    setIsOpen(true);
  };

  const dismissApplyAll = () => {
    if (!isApplyingToAll) setApplyAllPrompt(null);
  };

  return {
    isOpen,
    ops,
    setOps,
    isSaving,
    isResetting,
    isHistoryBusy,
    history,
    applyAllPrompt,
    isApplyingToAll,
    fetchHistory,
    save,
    confirmApplyToAll,
    undo,
    redo,
    reset,
    open,
    close,
    dismissApplyAll,
  };
}
