/**
 * SymbolsPage
 * Caption-grouped view of every symbol the user can see — both canonical
 * Symbol entities and Symbol-type annotations that have not yet been promoted
 * to one. Caption cards navigate to the caption detail page; uncaptioned items
 * expand inline since they have no shared caption to drill into. Supports
 * scope/document filtering and group sorting.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, FileText, FolderOpen, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Document as DocumentEntity,
  Symbol as SymbolEntity,
  SymbolScope,
  UnlinkedSymbolAnnotation,
} from '@/types';
import { documentService, symbolService } from '@/services';
import { useAuth } from '@/hooks';
import { LoadingSpinner } from '@/components/shared';
import SymbolImage from '@/components/annotation/SymbolImage';
import OccurrenceThumbnail from '@/components/annotation/OccurrenceThumbnail';

const SCOPES: { id: SymbolScope; label: string }[] = [
  { id: 'mine', label: 'My documents' },
  { id: 'shared', label: 'Shared with me' },
  { id: 'public', label: 'Public' },
  { id: 'all', label: 'All' },
];

type SortKey = 'caption-asc' | 'caption-desc' | 'count-desc' | 'count-asc';

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'caption-asc', label: 'Caption A→Z' },
  { id: 'caption-desc', label: 'Caption Z→A' },
  { id: 'count-desc', label: 'Most items first' },
  { id: 'count-asc', label: 'Fewest items first' },
];

const PAGE_SIZES = [12, 24, 48, 96];

const UNCAPTIONED_KEY = '__uncaptioned__';

type SymbolTile =
  | { kind: 'symbol'; key: string; content: string | null; symbol: SymbolEntity }
  | { kind: 'annotation'; key: string; content: string | null; annotation: UnlinkedSymbolAnnotation };

interface SymbolGroup {
  key: string;
  caption: string | null;
  tiles: SymbolTile[];
}

function buildGroups(
  symbols: SymbolEntity[],
  unlinked: UnlinkedSymbolAnnotation[],
): SymbolGroup[] {
  const map = new Map<string, SymbolGroup>();
  const push = (tile: SymbolTile) => {
    const k = tile.content?.trim() ? tile.content.trim() : UNCAPTIONED_KEY;
    let g = map.get(k);
    if (!g) {
      g = { key: k, caption: k === UNCAPTIONED_KEY ? null : k, tiles: [] };
      map.set(k, g);
    }
    g.tiles.push(tile);
  };

  for (const s of symbols) {
    push({ kind: 'symbol', key: `symbol:${s.id}`, content: s.content ?? null, symbol: s });
  }
  for (const a of unlinked) {
    push({
      kind: 'annotation',
      key: `annotation:${a.annotationId}`,
      content: a.content ?? null,
      annotation: a,
    });
  }
  return [...map.values()];
}

function sortGroups(groups: SymbolGroup[], sort: SortKey): SymbolGroup[] {
  // The "Uncategorized" bucket is always shown first — it's a catch-all that
  // typically needs the most attention.
  const uncategorized = groups.filter((g) => g.caption === null);
  const rest = groups.filter((g) => g.caption !== null);
  const captionAsc = (a: SymbolGroup, b: SymbolGroup) =>
    (a.caption ?? '').localeCompare(b.caption ?? '');
  switch (sort) {
    case 'caption-asc':
      rest.sort(captionAsc);
      break;
    case 'caption-desc':
      rest.sort((a, b) => -captionAsc(a, b));
      break;
    case 'count-desc':
      rest.sort((a, b) => b.tiles.length - a.tiles.length || captionAsc(a, b));
      break;
    case 'count-asc':
      rest.sort((a, b) => a.tiles.length - b.tiles.length || captionAsc(a, b));
      break;
  }
  return [...uncategorized, ...rest];
}

function Tile({ tile, size = 96 }: { tile: SymbolTile; size?: number }) {
  if (tile.kind === 'symbol') {
    return (
      <SymbolImage
        symbolId={tile.symbol.id}
        alt={tile.symbol.content ?? 'symbol'}
        className="max-w-full max-h-full object-contain"
      />
    );
  }
  return (
    <OccurrenceThumbnail
      documentId={tile.annotation.documentId}
      pageId={tile.annotation.pageId}
      bbox={tile.annotation.boundingBox}
      size={size}
      className="rounded-sm"
    />
  );
}

type DocumentKind = 'mine' | 'shared' | 'public';

interface TaggedDocument {
  id: string;
  title: string;
  kind: DocumentKind;
}

const KIND_BADGE: Record<DocumentKind, { label: string; className: string }> = {
  mine: {
    label: 'Mine',
    className: 'bg-ink-900/10 text-ink-900 border-ink-900/30',
  },
  shared: {
    label: 'Shared',
    className: 'bg-amber-100 text-amber-900 border-amber-700/40',
  },
  public: {
    label: 'Public',
    className: 'bg-emerald-100 text-emerald-900 border-emerald-700/40',
  },
};

const KindBadge: React.FC<{ kind: DocumentKind; className?: string }> = ({ kind, className }) => {
  const { label, className: c } = KIND_BADGE[kind];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-wider rounded border ${c} ${className ?? ''}`}
    >
      {label}
    </span>
  );
};

interface DocumentSlicerProps {
  documents: TaggedDocument[];
  selected: string[];
  onChange: (ids: string[]) => void;
  search: string;
  onSearchChange: (v: string) => void;
}

const DocumentSlicer: React.FC<DocumentSlicerProps> = ({
  documents,
  selected,
  onChange,
  search,
  onSearchChange,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter((d) => d.title.toLowerCase().includes(q));
  }, [documents, search]);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selectedSet.has(d.id));

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  };

  const toggleAllFiltered = () => {
    const next = new Set(selected);
    if (allFilteredSelected) filtered.forEach((d) => next.delete(d.id));
    else filtered.forEach((d) => next.add(d.id));
    onChange([...next]);
  };

  const triggerLabel =
    selected.length === 0
      ? 'All documents'
      : selected.length === 1
        ? documents.find((d) => d.id === selected[0])?.title ?? '1 document'
        : `${selected.length} documents`;

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border bg-parchment-50 text-ink-900 transition-colors ${
          open ? 'border-ink-900 ring-2 ring-ink-900/20' : 'border-sepia-600/30 hover:border-ink-900'
        }`}
      >
        <FileText className="w-4 h-4 text-sepia-700/80" />
        <span className="font-medium">Documents</span>
        <span className="text-xs text-sepia-700/80 max-w-[12rem] truncate">{triggerLabel}</span>
        {selected.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[11px] rounded-full bg-ink-900 text-parchment-50">
            {selected.length}
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-sepia-700/70 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {selected.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-1 max-w-full">
            {selected.slice(0, 3).map((id) => {
              const doc = documents.find((d) => d.id === id);
              if (!doc) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 text-xs rounded-full bg-parchment-100 border border-sepia-600/30 text-ink-900"
                >
                  <KindBadge kind={doc.kind} />
                  <span className="max-w-[8rem] truncate" title={doc.title}>{doc.title}</span>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="rounded-full p-0.5 hover:bg-sepia-600/20"
                    aria-label={`Remove ${doc.title}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selected.length > 3 && (
              <span className="text-xs text-sepia-700/80">+{selected.length - 3} more</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-sepia-700 hover:text-ink-900 underline-offset-2 hover:underline"
          >
            Clear
          </button>
        </>
      )}

      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 w-80 bg-parchment-50 border border-sepia-600/40 rounded-md shadow-lg">
          <div className="flex items-center gap-2 px-2 py-2 border-b border-sepia-600/20">
            <Search className="w-3.5 h-3.5 text-sepia-700/60 ml-1" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Filter documents…"
              className="flex-1 px-1 py-1 text-sm bg-transparent text-ink-900 focus:outline-none"
            />
            <button
              type="button"
              onClick={toggleAllFiltered}
              disabled={filtered.length === 0}
              className="px-2 py-0.5 text-[11px] rounded border border-sepia-600/30 bg-parchment-50 text-ink-900 disabled:opacity-40 hover:border-ink-900"
            >
              {allFilteredSelected ? 'None' : 'All'}
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs italic text-sepia-700/70">
                No documents match.
              </div>
            ) : (
              filtered.map((d) => {
                const checked = selectedSet.has(d.id);
                return (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-900 hover:bg-parchment-100 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(d.id)}
                      className="accent-ink-900"
                    />
                    <span className="flex-1 truncate" title={d.title}>{d.title}</span>
                    <KindBadge kind={d.kind} className="shrink-0" />
                  </label>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t border-sepia-600/20 text-[11px] text-sepia-700/80">
            <span>
              {selected.length === 0
                ? 'All documents'
                : `${selected.length} of ${documents.length} selected`}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-0.5 rounded bg-ink-900 text-parchment-50 hover:bg-ink-900/90"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const SCOPE_VALUES: SymbolScope[] = ['mine', 'shared', 'public', 'all'];
const SORT_VALUES: SortKey[] = ['caption-asc', 'caption-desc', 'count-desc', 'count-asc'];

function isScope(v: string | null): v is SymbolScope {
  return !!v && (SCOPE_VALUES as string[]).includes(v);
}
function isSort(v: string | null): v is SortKey {
  return !!v && (SORT_VALUES as string[]).includes(v);
}

export const SymbolsPage: React.FC = () => {
  // Filter/sort/paging state is mirrored to the URL so that navigating to
  // another page and pressing Back restores exactly what the user was looking
  // at — and so any view can be shared as a link.
  const [searchParams, setSearchParams] = useSearchParams();

  const [scope, setScope] = useState<SymbolScope>(() => {
    const v = searchParams.get('scope');
    return isScope(v) ? v : 'mine';
  });
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [documentIds, setDocumentIds] = useState<string[]>(() => {
    const v = searchParams.get('docs');
    return v ? v.split(',').filter(Boolean) : [];
  });
  const [docFilterSearch, setDocFilterSearch] = useState('');
  const [sort, setSort] = useState<SortKey>(() => {
    const v = searchParams.get('sort');
    return isSort(v) ? v : 'caption-asc';
  });
  const [documents, setDocuments] = useState<TaggedDocument[]>([]);
  const { user } = useAuth();
  const [symbols, setSymbols] = useState<SymbolEntity[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedSymbolAnnotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(() => {
    const v = Number(searchParams.get('page'));
    return Number.isFinite(v) && v > 0 ? v : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const v = Number(searchParams.get('size'));
    return PAGE_SIZES.includes(v) ? v : 24;
  });
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Mirror state → URL. We use replace so back/forward isn't polluted with
  // every keystroke, and only emit non-default values to keep the URL clean.
  useEffect(() => {
    const next = new URLSearchParams();
    if (scope !== 'mine') next.set('scope', scope);
    if (debouncedSearch) next.set('q', debouncedSearch);
    if (documentIds.length) next.set('docs', documentIds.join(','));
    if (sort !== 'caption-asc') next.set('sort', sort);
    if (page !== 1) next.set('page', String(page));
    if (pageSize !== 24) next.set('size', String(pageSize));
    setSearchParams(next, { replace: true });
  }, [scope, debouncedSearch, documentIds, sort, page, pageSize, setSearchParams]);

  // Populate the document filter dropdown. getMyDocuments returns owned +
  // shared, getPublicDocuments returns public; we union them and classify each
  // entry by the most specific kind (mine > shared > public) for the badge.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      documentService.getMyDocuments().catch(() => [] as DocumentEntity[]),
      documentService.getPublicDocuments().catch(() => [] as DocumentEntity[]),
    ]).then(([mineAndShared, pub]) => {
      if (cancelled) return;
      const mineAndSharedIds = new Set(mineAndShared.map((d) => d.id));
      const byId = new Map<string, DocumentEntity>();
      [...mineAndShared, ...pub].forEach((d) => byId.set(d.id, d));
      const tagged: TaggedDocument[] = [...byId.values()].map((d) => {
        const kind: DocumentKind =
          user && d.ownerId === user.id
            ? 'mine'
            : mineAndSharedIds.has(d.id)
              ? 'shared'
              : 'public';
        return { id: d.id, title: d.title, kind };
      });
      tagged.sort((a, b) => a.title.localeCompare(b.title));
      setDocuments(tagged);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const listParams = {
      scope,
      contentSearch: debouncedSearch || undefined,
      documentIds: documentIds.length ? documentIds : undefined,
      take: 200,
    };
    // Fetch the uncategorized bucket in parallel so it can't get crowded out
    // when the captioned half of the list already fills the take=200 window
    // (otherwise the Uncategorized card silently disappears under "All" while
    // still appearing under narrower scopes).
    const uncategorizedParams = { ...listParams, onlyUncaptioned: true };
    Promise.all([
      symbolService.list(listParams),
      symbolService.listUnlinkedAnnotations(listParams),
      symbolService.list(uncategorizedParams),
      symbolService.listUnlinkedAnnotations(uncategorizedParams),
    ])
      .then(([sym, ann, uncSym, uncAnn]) => {
        if (cancelled) return;
        const symById = new Map<string, SymbolEntity>();
        [...sym, ...uncSym].forEach((s) => symById.set(s.id, s));
        const annById = new Map<string, UnlinkedSymbolAnnotation>();
        [...ann, ...uncAnn].forEach((a) => annById.set(a.annotationId, a));
        setSymbols([...symById.values()]);
        setUnlinked([...annById.values()]);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e instanceof Error ? e.message : 'Failed to load symbols');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, debouncedSearch, documentIds]);

  const groups = useMemo(
    () => sortGroups(buildGroups(symbols, unlinked), sort),
    [symbols, unlinked, sort],
  );

  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  // Snap the current page back into range whenever filters change the group
  // count beneath it (e.g. switching scope leaves us past the last page).
  useEffect(() => {
    if (page > pageCount) setPage(1);
  }, [page, pageCount]);
  useEffect(() => {
    setPage(1);
  }, [scope, debouncedSearch, documentIds, sort, pageSize]);

  const pagedGroups = useMemo(
    () => groups.slice((page - 1) * pageSize, page * pageSize),
    [groups, page, pageSize],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-ink-900 mb-2">Symbols</h1>
        <p className="text-sm text-sepia-700">
          Canonical drawings and unpromoted symbol annotations, grouped by caption.
        </p>
      </header>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia-700/60" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by content…"
              className="w-full pl-9 pr-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {SCOPES.map((s) => (
              <button
                key={s.id}
                onClick={() => setScope(s.id)}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  scope === s.id
                    ? 'bg-ink-900 text-parchment-50 border-ink-900'
                    : 'bg-parchment-50 text-ink-900 border-sepia-600/30 hover:border-ink-900'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <DocumentSlicer
              documents={documents}
              selected={documentIds}
              onChange={setDocumentIds}
              search={docFilterSearch}
              onSearchChange={setDocFilterSearch}
            />
          </div>

          <label className="flex items-center gap-2 sm:ml-auto">
            <span className="text-xs uppercase tracking-wider text-sepia-700/80 shrink-0">
              Sort
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="px-3 py-2 bg-parchment-50 border border-sepia-600/30 rounded-md text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900 focus:border-ink-900"
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="py-20"><LoadingSpinner /></div>
      ) : groups.length === 0 ? (
        <div className="py-16 text-center text-sepia-700 font-serif italic">
          No symbols match this filter yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {pagedGroups.map((group) => {
            const representative = group.tiles[0];
            const count = group.tiles.length;
            const isUncaptioned = group.caption === null;
            const onCardClick = () => {
              if (isUncaptioned) {
                navigate('/symbols/uncategorized');
              } else {
                navigate(`/symbols/captions/${encodeURIComponent(group.caption!)}`);
              }
            };
            return (
              <button
                key={group.key}
                type="button"
                onClick={onCardClick}
                className="text-left block group bg-parchment-50 border border-sepia-600/30 rounded-md p-2 transition-colors hover:border-ink-900"
              >
                  <div className="aspect-square bg-white rounded border border-sepia-600/20 flex items-center justify-center overflow-hidden">
                    {isUncaptioned ? (
                      <div className="flex flex-col items-center justify-center text-sepia-700/70 gap-1">
                        <FolderOpen className="w-10 h-10" strokeWidth={1.5} />
                        <span className="text-[10px] uppercase tracking-wider">
                          Uncategorized
                        </span>
                      </div>
                    ) : (
                      <Tile tile={representative} />
                    )}
                  </div>
                  <div className="mt-2 text-xs truncate text-ink-900">
                    {group.caption ?? (
                      <span className="italic text-sepia-700/60">Uncategorized</span>
                    )}
                  </div>
                  <div className="text-[10px] text-sepia-700/70">
                    {count} {count === 1 ? 'item' : 'items'}
                  </div>
              </button>
            );
          })}
        </div>
      )}

      {!loading && groups.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-sepia-700">
          <div>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, groups.length)} of {groups.length} groups
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-sepia-700/80">Per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 bg-parchment-50 border border-sepia-600/30 rounded text-ink-900 focus:outline-none focus:ring-2 focus:ring-ink-900"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded border border-sepia-600/30 bg-parchment-50 text-ink-900 disabled:opacity-40 hover:border-ink-900"
            >
              Prev
            </button>
            <span className="text-xs">
              Page {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="px-3 py-1 rounded border border-sepia-600/30 bg-parchment-50 text-ink-900 disabled:opacity-40 hover:border-ink-900"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SymbolsPage;
