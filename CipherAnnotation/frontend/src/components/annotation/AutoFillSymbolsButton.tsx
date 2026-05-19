import React, { useEffect, useRef, useState } from 'react';
import { Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Tooltip } from '@/components/shared';
import { Modal } from '@/components/shared';
import { useAppSettings } from '@/hooks';
import { useAutoFillJobs } from '@/context/AutoFillJobsContext';

interface Props {
  pageId: string;
  documentId: string;
  onCompleted?: () => void;
  disabled?: boolean;
}

export const AutoFillSymbolsButton: React.FC<Props> = ({ pageId, documentId, onCompleted, disabled }) => {
  const { settings } = useAppSettings();
  const { start, jobs } = useAutoFillJobs();
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState<null | 'Page' | 'Document'>(null);

  // Refresh the annotation canvas when *this* page finishes captioning.
  // We track which page rows we've already fired for so a long-lived completed
  // job doesn't keep re-triggering refetches on every poll tick.
  const seenCompletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!onCompleted) return;
    for (const job of jobs) {
      for (const p of job.pages) {
        if (p.pageId !== pageId) continue;
        if (p.status !== 'Completed' && p.status !== 'Failed') continue;
        const key = `${job.jobId}:${p.pageId}`;
        if (seenCompletedRef.current.has(key)) continue;
        seenCompletedRef.current.add(key);
        onCompleted();
      }
    }
  }, [jobs, pageId, onCompleted]);

  if (!settings.autoContentGenerator) return null;

  const run = async (scope: 'Page' | 'Document') => {
    setStarting(scope);
    try {
      const id = scope === 'Page' ? pageId : documentId;
      await start(scope, id);
      toast.success(
        scope === 'Page'
          ? 'Captioning this page in the background — see the bell for progress.'
          : 'Captioning the whole document in the background — see the bell for progress.',
      );
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start auto-fill.');
    } finally {
      setStarting(null);
    }
  };

  return (
    <>
      <Tooltip label="AI: caption empty symbols" position="left">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={disabled}
          className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
            disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <Wand2 className="w-5 h-5" style={{ color: '#0891b2' }} />
          <span className="text-xs font-medium">Caption symbols</span>
        </button>
      </Tooltip>

      <Modal isOpen={open} onClose={() => starting === null && setOpen(false)} title="Caption symbols with AI">
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            An AI vision model will look at every Symbol annotation with an empty <code>content</code> field
            and suggest a short caption. The job runs in the background — you can keep working and watch
            progress under the bell in the navbar.
          </p>
          <p className="text-gray-500">Pick a scope:</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => run('Page')}
              disabled={starting !== null}
              className="px-4 py-2 rounded bg-sepia-700 text-parchment-50 hover:bg-sepia-800 disabled:opacity-60"
            >
              {starting === 'Page' ? 'Starting…' : 'Current page only'}
            </button>
            <button
              type="button"
              onClick={() => run('Document')}
              disabled={starting !== null}
              className="px-4 py-2 rounded border border-sepia-600/30 hover:bg-parchment-100 disabled:opacity-60"
            >
              {starting === 'Document' ? 'Starting…' : 'Whole document'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AutoFillSymbolsButton;
