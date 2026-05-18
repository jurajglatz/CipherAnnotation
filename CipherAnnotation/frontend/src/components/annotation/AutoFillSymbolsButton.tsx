import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Tooltip } from '@/components/shared';
import { Modal } from '@/components/shared';
import symbolService from '@/services/symbolService';
import { useAppSettings } from '@/hooks';

interface Props {
  pageId: string;
  documentId: string;
  onCompleted?: () => void;
  disabled?: boolean;
}

export const AutoFillSymbolsButton: React.FC<Props> = ({ pageId, documentId, onCompleted, disabled }) => {
  const { settings } = useAppSettings();
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState<null | 'Page' | 'Document'>(null);

  if (!settings.autoContentGenerator) return null;

  const run = async (scope: 'Page' | 'Document') => {
    setRunning(scope);
    try {
      const id = scope === 'Page' ? pageId : documentId;
      const result = await symbolService.autoFillContent(scope, id);
      if (result.filled === 0 && result.candidates === 0) {
        toast('No symbols needing content were found.', { icon: 'ℹ️' });
      } else {
        const parts = [`${result.filled} filled`];
        if (result.skippedNotOwner > 0) parts.push(`${result.skippedNotOwner} not owned`);
        if (result.skippedNoSuggestion > 0) parts.push(`${result.skippedNoSuggestion} no suggestion`);
        toast.success(`Auto-fill: ${parts.join(', ')}.`);
      }
      onCompleted?.();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Auto-fill failed.');
    } finally {
      setRunning(null);
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

      <Modal isOpen={open} onClose={() => running === null && setOpen(false)} title="Caption symbols with AI">
        <div className="space-y-4 text-sm text-gray-700">
          <p>
            An AI vision model will look at every Symbol annotation with an empty <code>content</code> field
            and suggest a short caption. Suggestions are saved directly. This may take a while on large pages.
          </p>
          <p className="text-gray-500">Pick a scope:</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => run('Page')}
              disabled={running !== null}
              className="px-4 py-2 rounded bg-sepia-700 text-parchment-50 hover:bg-sepia-800 disabled:opacity-60"
            >
              {running === 'Page' ? 'Captioning current page…' : 'Current page only'}
            </button>
            <button
              type="button"
              onClick={() => run('Document')}
              disabled={running !== null}
              className="px-4 py-2 rounded border border-sepia-600/30 hover:bg-parchment-100 disabled:opacity-60"
            >
              {running === 'Document' ? 'Captioning whole document…' : 'Whole document'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AutoFillSymbolsButton;
