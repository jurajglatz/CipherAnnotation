/**
 * SymbolCaptionPage
 * Detail view for a caption group. The top of the page shows an editable
 * representative drawing (redrawable by the owner of the underlying canonical
 * Symbol, or creatable if no Symbol exists yet for this caption). Below it is
 * the grid of every symbol/annotation tile sharing this caption.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Document as DocumentEntity,
  Symbol as SymbolEntity,
  UnlinkedSymbolAnnotation,
} from '@/types';
import { annotationService, documentService, symbolService } from '@/services';
import { useAuth } from '@/hooks';
import { useTour } from '@/hooks/useTour';
import { LoadingSpinner, Modal, ConfirmDialog } from '@/components/shared';
import SymbolImage from '@/components/annotation/SymbolImage';
import SymbolWhiteboard from '@/components/annotation/SymbolWhiteboard';
import OccurrenceThumbnail from '@/components/annotation/OccurrenceThumbnail';

type DocKind = 'mine' | 'shared' | 'public';

const KIND_SECTIONS: { kind: DocKind; label: string }[] = [
  { kind: 'mine', label: 'My documents' },
  { kind: 'shared', label: 'Shared with me' },
  { kind: 'public', label: 'Public' },
];

const PAGE_SIZE = 32;

const SectionPager: React.FC<{
  page: number;
  pageCount: number;
  total: number;
  onPage: (next: number) => void;
}> = ({ page, pageCount, total, onPage }) => {
  if (pageCount <= 1) return null;
  const from = page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-sepia-700">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page === 0}
          className="px-2 py-1 rounded border border-sepia-600/30 hover:border-ink-900 disabled:opacity-40 disabled:hover:border-sepia-600/30"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="px-2 text-ink-900">
          {page + 1} / {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount - 1}
          className="px-2 py-1 rounded border border-sepia-600/30 hover:border-ink-900 disabled:opacity-40 disabled:hover:border-sepia-600/30"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

interface TileContentEditorProps {
  value: string;
  disabled?: boolean;
  canSave: boolean;
  onChange: (v: string) => void;
  onSave: () => void;
}

const TileContentEditor: React.FC<TileContentEditorProps> = ({
  value,
  disabled,
  canSave,
  onChange,
  onSave,
}) => (
  <div className="mt-1 flex items-stretch gap-1">
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && canSave) onSave();
      }}
      placeholder="content"
      className="min-w-0 flex-1 px-1.5 py-0.5 text-[11px] bg-white border border-sepia-600/30 rounded text-ink-900 disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-ink-900"
    />
    <button
      type="button"
      onClick={onSave}
      disabled={!canSave}
      title="Save content"
      aria-label="Save content"
      className="px-1.5 py-0.5 rounded border border-sepia-600/30 bg-parchment-50 text-ink-900 disabled:opacity-40 hover:border-ink-900"
    >
      <Check className="w-3 h-3" />
    </button>
  </div>
);

interface SymbolCaptionPageProps {
  /** When true, the page shows the "Uncategorized" bucket: symbols/annotations
   *  with no content. The caption header becomes a read-only title. */
  uncategorized?: boolean;
}

export const SymbolCaptionPage: React.FC<SymbolCaptionPageProps> = ({ uncategorized = false }) => {
  const { caption: rawCaption } = useParams<{ caption: string }>();
  const caption = useMemo(
    () => (uncategorized ? '' : rawCaption ? decodeURIComponent(rawCaption) : ''),
    [rawCaption, uncategorized],
  );
  const navigate = useNavigate();
  const { user } = useAuth();
  useTour('symbol-caption');

  const [symbols, setSymbols] = useState<SymbolEntity[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedSymbolAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [captionDraft, setCaptionDraft] = useState(caption);
  const [savingCaption, setSavingCaption] = useState(false);
  const [editingImage, setEditingImage] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);
  const [confirmDeleteCanonical, setConfirmDeleteCanonical] = useState(false);
  const [deletingCanonical, setDeletingCanonical] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingTileKey, setSavingTileKey] = useState<string | null>(null);
  const [docKindById, setDocKindById] = useState<Map<string, DocKind>>(new Map());
  const [pageByKind, setPageByKind] = useState<Record<DocKind, number>>({
    mine: 0,
    shared: 0,
    public: 0,
  });

  // Reset per-section paging whenever the caption changes (e.g. navigating
  // between captions or in/out of the uncategorized bucket) so we don't land
  // on an empty page that no longer exists in the new dataset.
  useEffect(() => {
    setPageByKind({ mine: 0, shared: 0, public: 0 });
  }, [caption, uncategorized]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      documentService.getMyDocuments().catch(() => [] as DocumentEntity[]),
      documentService.getPublicDocuments().catch(() => [] as DocumentEntity[]),
    ]).then(([mineAndShared, pub]) => {
      if (cancelled) return;
      const mineAndSharedIds = new Set(mineAndShared.map((d) => d.id));
      const next = new Map<string, DocKind>();
      [...mineAndShared, ...pub].forEach((d) => {
        const kind: DocKind =
          user && d.ownerId === user.id
            ? 'mine'
            : mineAndSharedIds.has(d.id)
              ? 'shared'
              : 'public';
        next.set(d.id, kind);
      });
      setDocKindById(next);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const load = React.useCallback(async () => {
    if (!uncategorized && !caption) return;
    setLoading(true);
    try {
      const listParams = uncategorized
        ? { scope: 'all' as const, onlyUncaptioned: true, take: 200 }
        : { scope: 'all' as const, contentSearch: caption, take: 200 };
      const [sym, ann] = await Promise.all([
        symbolService.list(listParams),
        symbolService.listUnlinkedAnnotations(listParams),
      ]);
      const eq = (c: string | null | undefined) =>
        uncategorized ? !(c?.trim()) : (c?.trim() ?? '') === caption;
      const filteredSym = sym.filter((s) => eq(s.content));
      const filteredAnn = ann.filter((a) => eq(a.content));
      setSymbols(filteredSym);
      setUnlinked(filteredAnn);
      setCaptionDraft(caption);
      const next: Record<string, string> = {};
      filteredSym.forEach((s) => {
        next[`symbol:${s.id}`] = s.content ?? '';
      });
      filteredAnn.forEach((a) => {
        next[`annotation:${a.annotationId}`] = a.content ?? '';
      });
      setDrafts(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load caption');
    } finally {
      setLoading(false);
    }
  }, [caption, uncategorized]);

  useEffect(() => {
    void load();
  }, [load]);

  // Prefer a Symbol the user owns so they can redraw it; otherwise fall back
  // to any Symbol in the group; if none, the representative is just the first
  // annotation crop (and saving the whiteboard creates a brand-new Symbol).
  const ownedSymbol = useMemo(
    () => symbols.find((s) => user && s.ownerUserId === user.id) ?? null,
    [symbols, user],
  );
  const representativeSymbol = ownedSymbol ?? symbols[0] ?? null;
  const representativeAnnotation = unlinked[0] ?? null;

  const canRedraw = !uncategorized && !!user && (!!ownedSymbol || (symbols.length === 0));
  // We let any signed-in user submit a rename; the server only updates the
  // symbols/annotations they can actually edit, so unauthorised callers just
  // see an "updated 0" result rather than a hard 403.
  const canRenameCaption = !uncategorized && !!user && (symbols.length + unlinked.length) > 0;

  async function saveImage(png: Blob) {
    try {
      setSavingImage(true);
      if (ownedSymbol) {
        await symbolService.updateImage(ownedSymbol.id, png);
        toast.success('Drawing updated');
      } else {
        await symbolService.create(png, caption);
        toast.success('Canonical drawing created');
      }
      setEditingImage(false);
      setImageVersion((v) => v + 1);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingImage(false);
    }
  }

  async function deleteOwnedCanonical() {
    if (!ownedSymbol) return;
    try {
      setDeletingCanonical(true);
      await symbolService.delete(ownedSymbol.id);
      toast.success('Canonical drawing deleted');
      setImageVersion((v) => v + 1);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingCanonical(false);
      setConfirmDeleteCanonical(false);
    }
  }

  async function saveTileSymbol(s: SymbolEntity) {
    const key = `symbol:${s.id}`;
    const next = (drafts[key] ?? '').trim() || null;
    if ((next ?? '') === (s.content ?? '')) return;
    try {
      setSavingTileKey(key);
      const updated = await symbolService.update(s.id, next);
      setSymbols((cur) => cur.map((x) => (x.id === s.id ? updated : x)));
      toast.success('Saved');
      // Renaming this symbol to a different caption removes it from this view.
      if ((updated.content?.trim() ?? '') !== caption) {
        setSymbols((cur) => cur.filter((x) => x.id !== s.id));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingTileKey(null);
    }
  }

  async function saveTileAnnotation(a: UnlinkedSymbolAnnotation) {
    const key = `annotation:${a.annotationId}`;
    const next = (drafts[key] ?? '').trim();
    if (next === (a.content ?? '').trim()) return;
    try {
      setSavingTileKey(key);
      await annotationService.update(a.pageId, a.annotationId, { content: next });
      toast.success('Saved');
      setUnlinked((cur) => {
        // If still within the caption, refresh in place; otherwise drop it.
        if (next === caption) {
          return cur.map((x) =>
            x.annotationId === a.annotationId ? { ...x, content: next } : x,
          );
        }
        return cur.filter((x) => x.annotationId !== a.annotationId);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingTileKey(null);
    }
  }

  async function saveCaption() {
    const next = captionDraft.trim();
    if (!next || next === caption) return;
    try {
      setSavingCaption(true);
      const result = await symbolService.renameCaptionByContent(caption, next);
      if (result.updated === 0) {
        toast.error('Nothing to rename — you don’t own a symbol or annotation here.');
        return;
      }
      const parts: string[] = [];
      if (result.symbolsUpdated > 0)
        parts.push(`${result.symbolsUpdated} symbol${result.symbolsUpdated === 1 ? '' : 's'}`);
      if (result.annotationsUpdated > 0)
        parts.push(
          `${result.annotationsUpdated} annotation${result.annotationsUpdated === 1 ? '' : 's'}`,
        );
      toast.success(`Renamed ${parts.join(' and ')}`);
      navigate(`/symbols/captions/${encodeURIComponent(next)}`, { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingCaption(false);
    }
  }

  // The representative symbol is already shown as the editable thumbnail at
  // the top — hide it from the grid so drawing a canonical picture doesn't
  // produce a duplicate tile.
  const gridSymbols = useMemo(
    () => (representativeSymbol ? symbols.filter((s) => s.id !== representativeSymbol.id) : symbols),
    [symbols, representativeSymbol],
  );
  // The count must reflect every member of the caption (including the
  // representative shown above), not just what's in the grid — otherwise the
  // detail page disagrees with the index card.
  const tileCount = symbols.length + unlinked.length;

  const classifyAnnotation = (a: UnlinkedSymbolAnnotation): DocKind =>
    docKindById.get(a.documentId) ?? 'public';
  // For symbols we don't know which document they belong to without fetching
  // occurrences, so we only mark them as "mine" when the current user owns
  // them; otherwise they fall under "public" as a best-effort bucket.
  const classifySymbol = (s: SymbolEntity): DocKind =>
    user && s.ownerUserId === user.id ? 'mine' : 'public';

  const sectionedTiles = useMemo(() => {
    const groups: Record<DocKind, { symbols: SymbolEntity[]; unlinked: UnlinkedSymbolAnnotation[] }> = {
      mine: { symbols: [], unlinked: [] },
      shared: { symbols: [], unlinked: [] },
      public: { symbols: [], unlinked: [] },
    };
    gridSymbols.forEach((s) => groups[classifySymbol(s)].symbols.push(s));
    unlinked.forEach((a) => groups[classifyAnnotation(a)].unlinked.push(a));
    return groups;
  }, [gridSymbols, unlinked, docKindById, user]);

  if (!uncategorized && !caption) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <p className="font-serif italic text-sepia-700">Missing caption.</p>
        <Link to="/symbols" className="text-ink-900 underline mt-2 inline-block">Back to symbols</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/symbols" className="inline-flex items-center gap-1 text-sm text-sepia-700 hover:text-ink-900 mb-4">
        <ArrowLeft className="w-4 h-4" /> All symbols
      </Link>

      {loading ? (
        <div className="py-20"><LoadingSpinner /></div>
      ) : (
        <>
          <div className="grid md:grid-cols-[256px_1fr] gap-6 mb-8">
            <div
              data-tour="caption-image"
              className="relative bg-white border border-sepia-600/30 rounded-md p-2 flex items-center justify-center"
              style={{ height: 256 }}
            >
              {uncategorized ? (
                <div className="flex flex-col items-center justify-center text-sepia-700/70 gap-2">
                  <FolderOpen className="w-20 h-20" strokeWidth={1.5} />
                  <span className="text-xs uppercase tracking-wider">Uncategorized</span>
                </div>
              ) : representativeSymbol ? (
                <SymbolImage
                  key={imageVersion}
                  symbolId={representativeSymbol.id}
                  alt={caption}
                  className="max-w-full max-h-full object-contain"
                />
              ) : representativeAnnotation ? (
                <OccurrenceThumbnail
                  documentId={representativeAnnotation.documentId}
                  pageId={representativeAnnotation.pageId}
                  bbox={representativeAnnotation.boundingBox}
                  size={232}
                />
              ) : (
                <span className="font-serif italic text-sepia-700/70 text-sm">No drawings yet</span>
              )}
              {canRedraw && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingImage(true)}
                    title={ownedSymbol ? 'Redraw symbol' : 'Create canonical drawing'}
                    aria-label="Edit drawing"
                    className="p-1.5 rounded-md bg-parchment-50/90 border border-sepia-600/40 text-sepia-700 hover:text-ink-900 hover:bg-parchment-50 shadow-sm"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {ownedSymbol && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCanonical(true)}
                      title="Delete canonical drawing"
                      aria-label="Delete canonical drawing"
                      className="p-1.5 rounded-md bg-parchment-50/90 border border-cipher-red/40 text-cipher-red hover:bg-cipher-red/10 shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-sepia-700 mb-1">
                  Caption
                </span>
                {uncategorized ? (
                  <h2 className="font-serif text-2xl text-ink-900">Uncategorized</h2>
                ) : (
                  <>
                    <input
                      data-tour="caption-name"
                      type="text"
                      value={captionDraft}
                      disabled={!canRenameCaption}
                      onChange={(e) => setCaptionDraft(e.target.value)}
                      className="w-full px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
                    />
                    <p className="mt-1 text-[11px] text-sepia-700/80">
                      {canRenameCaption
                        ? 'Saving renames every symbol and annotation here that you can edit.'
                        : 'Nothing in this caption is editable by you.'}
                    </p>
                  </>
                )}
              </div>
              <div className="text-xs text-sepia-700/70">
                {tileCount} {tileCount === 1 ? 'item' : 'items'}
                {uncategorized ? ' without a caption' : ' with this caption'}
              </div>
              {uncategorized && (
                <p className="text-[11px] text-sepia-700/80">
                  Set a caption on any tile below to move it out of this bucket.
                </p>
              )}
              {canRenameCaption && (
                <button
                  type="button"
                  onClick={saveCaption}
                  disabled={
                    savingCaption || !captionDraft.trim() || captionDraft.trim() === caption
                  }
                  className="px-3 py-2 text-sm bg-ink-900 text-parchment-50 rounded hover:bg-ink-900/90 disabled:opacity-40"
                >
                  Save caption
                </button>
              )}
            </div>
          </div>

          <section data-tour="caption-tile-grid">
            <h2 className="font-serif text-xl text-ink-900 mb-3">All items</h2>
            {tileCount === 0 ? (
              <p className="text-sm text-sepia-700 italic">Nothing has this caption yet.</p>
            ) : (
              KIND_SECTIONS.map(({ kind, label }) => {
                const { symbols: secSymbols, unlinked: secUnlinked } = sectionedTiles[kind];
                const sectionCount = secSymbols.length + secUnlinked.length;
                if (sectionCount === 0) return null;
                // Concatenate the two arrays into one logical list so a page
                // boundary can fall in the middle of "symbols → unlinked"
                // without us having to coordinate two cursors.
                const pageCount = Math.max(1, Math.ceil(sectionCount / PAGE_SIZE));
                const safePage = Math.min(pageByKind[kind], pageCount - 1);
                const start = safePage * PAGE_SIZE;
                const end = start + PAGE_SIZE;
                const symbolsEnd = secSymbols.length;
                const pageSymbols = secSymbols.slice(
                  Math.min(start, symbolsEnd),
                  Math.min(end, symbolsEnd),
                );
                const pageUnlinked = secUnlinked.slice(
                  Math.max(0, start - symbolsEnd),
                  Math.max(0, end - symbolsEnd),
                );
                return (
                  <div key={kind} className="mb-6 last:mb-0">
                    <div className="flex items-baseline gap-2 mb-2">
                      <h3 className="font-serif text-base text-ink-900">{label}</h3>
                      <span className="text-[11px] text-sepia-700/70">
                        {sectionCount} {sectionCount === 1 ? 'item' : 'items'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {pageSymbols.map((s) => {
                  const key = `symbol:${s.id}`;
                  const draft = drafts[key] ?? '';
                  const isOwner = !!user && s.ownerUserId === user.id;
                  const isSaving = savingTileKey === key;
                  const isDirty = (draft.trim() || null) !== (s.content ?? null);
                  return (
                    <div
                      key={key}
                      className="bg-parchment-50 border border-sepia-600/30 rounded p-1.5 flex flex-col"
                    >
                      <Link
                        to={`/symbols/${s.id}`}
                        className="block aspect-square bg-white rounded border border-sepia-600/20 flex items-center justify-center overflow-hidden hover:border-ink-900 transition-colors"
                      >
                        <SymbolImage
                          symbolId={s.id}
                          alt={s.content ?? 'symbol'}
                          className="max-w-full max-h-full object-contain"
                        />
                      </Link>
                      <div className="mt-1 text-[10px] text-sepia-700/70">
                        {s.referenceCount} {s.referenceCount === 1 ? 'use' : 'uses'}
                      </div>
                      <TileContentEditor
                        value={draft}
                        disabled={!isOwner || isSaving}
                        canSave={isOwner && isDirty && !isSaving}
                        onChange={(v) => setDrafts((d) => ({ ...d, [key]: v }))}
                        onSave={() => saveTileSymbol(s)}
                      />
                    </div>
                  );
                })}
                {pageUnlinked.map((a) => {
                  const key = `annotation:${a.annotationId}`;
                  const draft = drafts[key] ?? '';
                  const isSaving = savingTileKey === key;
                  const isDirty = draft.trim() !== (a.content ?? '').trim();
                  return (
                    <div
                      key={key}
                      className="bg-parchment-50 border border-dashed border-sepia-600/40 rounded p-1.5 flex flex-col"
                    >
                      <Link
                        to={`/documents/${a.documentId}/annotate/${a.pageId}?annotation=${a.annotationId}`}
                        title={`${a.documentTitle} — page ${a.pageNumber}`}
                        className="block aspect-square bg-white rounded border border-sepia-600/20 flex items-center justify-center overflow-hidden hover:border-ink-900 transition-colors"
                      >
                        <OccurrenceThumbnail
                          documentId={a.documentId}
                          pageId={a.pageId}
                          bbox={a.boundingBox}
                          size={96}
                        />
                      </Link>
                      <div className="mt-1 text-[10px] text-sepia-700/70 truncate">
                        p.{a.pageNumber} · {a.documentTitle}
                      </div>
                      <TileContentEditor
                        value={draft}
                        disabled={isSaving}
                        canSave={isDirty && !isSaving}
                        onChange={(v) => setDrafts((d) => ({ ...d, [key]: v }))}
                        onSave={() => saveTileAnnotation(a)}
                      />
                    </div>
                  );
                })}
                    </div>
                    <SectionPager
                      page={safePage}
                      pageCount={pageCount}
                      total={sectionCount}
                      onPage={(next) =>
                        setPageByKind((cur) => ({
                          ...cur,
                          [kind]: Math.max(0, Math.min(pageCount - 1, next)),
                        }))
                      }
                    />
                  </div>
                );
              })
            )}
          </section>
        </>
      )}

      <Modal
        isOpen={editingImage}
        onClose={() => !savingImage && setEditingImage(false)}
        title={ownedSymbol ? 'Redraw symbol' : 'Create canonical drawing'}
        size="md"
      >
        <SymbolWhiteboard
          onSave={saveImage}
          onCancel={() => setEditingImage(false)}
          busy={savingImage}
        />
      </Modal>

      <ConfirmDialog
        isOpen={confirmDeleteCanonical}
        title="Delete canonical drawing?"
        message="The shared drawing for this caption will be removed. Annotations that referenced it remain but lose their linked drawing."
        confirmText={deletingCanonical ? 'Deleting…' : 'Delete'}
        isDangerous
        onConfirm={deleteOwnedCanonical}
        onClose={() => !deletingCanonical && setConfirmDeleteCanonical(false)}
      />
    </div>
  );
};

export default SymbolCaptionPage;
