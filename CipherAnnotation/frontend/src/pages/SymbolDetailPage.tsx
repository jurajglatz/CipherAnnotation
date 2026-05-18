/**
 * SymbolDetailPage
 * Shows the canonical drawing + every annotation occurrence visible to the
 * user. The owner can edit Content; everyone can jump to an occurrence to
 * see it in the annotation editor.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Symbol as SymbolEntity, SymbolOccurrence } from '@/types';
import { symbolService } from '@/services';
import { useAuth } from '@/hooks';
import { LoadingSpinner, ConfirmDialog, Modal } from '@/components/shared';
import SymbolImage from '@/components/annotation/SymbolImage';
import SymbolWhiteboard from '@/components/annotation/SymbolWhiteboard';
import OccurrenceThumbnail from '@/components/annotation/OccurrenceThumbnail';

export const SymbolDetailPage: React.FC = () => {
  const { symbolId } = useParams<{ symbolId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [symbol, setSymbol] = useState<SymbolEntity | null>(null);
  const [occurrences, setOccurrences] = useState<SymbolOccurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [contentDraft, setContentDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);

  const isOwner = useMemo(
    () => !!symbol && !!user && symbol.ownerUserId === user.id,
    [symbol, user],
  );

  useEffect(() => {
    if (!symbolId) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([symbolService.getById(symbolId), symbolService.getOccurrences(symbolId)])
      .then(([s, occ]) => {
        if (cancelled) return;
        setSymbol(s);
        setContentDraft(s.content ?? '');
        setOccurrences(occ);
      })
      .catch((e) => !cancelled && toast.error(e instanceof Error ? e.message : 'Failed to load symbol'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [symbolId]);

  async function saveContent() {
    if (!symbolId) return;
    try {
      setSaving(true);
      const updated = await symbolService.update(symbolId, contentDraft || null);
      setSymbol(updated);
      toast.success('Saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function saveImage(png: Blob) {
    if (!symbolId) return;
    try {
      setSavingImage(true);
      const updated = await symbolService.updateImage(symbolId, png);
      setSymbol(updated);
      setImageVersion((v) => v + 1);
      setEditingImage(false);
      toast.success('Drawing updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSavingImage(false);
    }
  }

  async function deleteSymbol() {
    if (!symbolId) return;
    try {
      await symbolService.delete(symbolId);
      toast.success('Symbol deleted');
      navigate('/symbols');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  if (loading) {
    return <div className="py-20"><LoadingSpinner /></div>;
  }
  if (!symbol) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="font-serif italic text-sepia-700">Symbol not found.</p>
        <Link to="/symbols" className="text-ink-900 underline mt-2 inline-block">
          Back to symbols
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/symbols" className="inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-ink-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> All symbols
      </Link>

      <div className="grid md:grid-cols-[256px_1fr] gap-6 mb-8">
        <div className="relative bg-white border border-sepia-600/30 rounded-md p-2 flex items-center justify-center" style={{ height: 256 }}>
          <SymbolImage
            key={imageVersion}
            symbolId={symbol.id}
            alt={symbol.content ?? 'symbol'}
            className="max-w-full max-h-full object-contain"
          />
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditingImage(true)}
              title="Redraw symbol"
              aria-label="Redraw symbol"
              className="absolute top-2 right-2 p-1.5 rounded-md bg-parchment-50/90 border border-sepia-600/40 text-sepia-700 hover:text-ink-900 hover:bg-parchment-50 shadow-sm"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
              Content
            </label>
            <input
              type="text"
              value={contentDraft}
              disabled={!isOwner}
              onChange={(e) => setContentDraft(e.target.value)}
              placeholder={isOwner ? 'e.g. A, ⚹, …' : '(no content)'}
              className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
            />
          </div>

          <div className="text-xs text-sepia-700/70 font-mono">{symbol.id}</div>
          <div className="text-xs text-sepia-700/70">
            {symbol.referenceCount} occurrence{symbol.referenceCount === 1 ? '' : 's'}
            {' • '}
            Created {new Date(symbol.createdAt).toLocaleString()}
          </div>

          {isOwner && (
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={saveContent}
                disabled={saving || (contentDraft ?? '') === (symbol.content ?? '')}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-ink-900 text-parchment-50 rounded hover:bg-ink-900/90 disabled:opacity-40"
              >
                <Save className="w-3 h-3" /> Save
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-cipher-red/40 text-cipher-red rounded hover:bg-cipher-red/10"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-serif text-xl text-ink-900 mb-3">Occurrences</h2>
        {occurrences.length === 0 ? (
          <p className="text-sm text-sepia-700 italic">No annotations reference this symbol yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {occurrences.map((o) => (
              <Link
                key={o.annotationId}
                to={`/documents/${o.documentId}/annotate/${o.pageId}`}
                title={`${o.documentTitle} — page ${o.pageNumber}`}
                className="block bg-parchment-50 border border-sepia-600/30 rounded-md p-2 hover:border-ink-900 transition-colors"
              >
                <OccurrenceThumbnail
                  documentId={o.documentId}
                  pageId={o.pageId}
                  bbox={o.boundingBox}
                  size={128}
                  className="rounded border border-sepia-600/20 mx-auto"
                />
                <div className="mt-2 text-xs font-serif text-ink-900 truncate">
                  {o.documentTitle}
                </div>
                <div className="text-[10px] text-sepia-700/80 truncate">
                  Page {o.pageNumber}
                  {o.content && <> • {o.content}</>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={editingImage}
        onClose={() => !savingImage && setEditingImage(false)}
        title="Redraw symbol"
        size="md"
      >
        <SymbolWhiteboard
          onSave={saveImage}
          onCancel={() => setEditingImage(false)}
          busy={savingImage}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Delete symbol?"
        message="This unlinks the canonical drawing from every annotation that referenced it. The annotations themselves remain."
        confirmText="Delete"
        isDangerous
        onConfirm={() => {
          setConfirmDelete(false);
          deleteSymbol();
        }}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
};

export default SymbolDetailPage;
