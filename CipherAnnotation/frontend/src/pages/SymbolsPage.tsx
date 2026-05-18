/**
 * SymbolsPage
 * Top-level grid of canonical symbols visible to the current user, with a
 * scope filter (mine / shared / public / all) and a content search.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { Symbol as SymbolEntity, SymbolScope } from '@/types';
import { symbolService } from '@/services';
import { LoadingSpinner } from '@/components/shared';
import SymbolImage from '@/components/annotation/SymbolImage';

const SCOPES: { id: SymbolScope; label: string }[] = [
  { id: 'mine', label: 'My documents' },
  { id: 'shared', label: 'Shared with me' },
  { id: 'public', label: 'Public' },
  { id: 'all', label: 'All' },
];

export const SymbolsPage: React.FC = () => {
  const [scope, setScope] = useState<SymbolScope>('mine');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [symbols, setSymbols] = useState<SymbolEntity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    symbolService
      .list({ scope, contentSearch: debouncedSearch || undefined, take: 100 })
      .then((data) => {
        if (!cancelled) setSymbols(data);
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
  }, [scope, debouncedSearch]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-ink-900 mb-2">Symbols</h1>
        <p className="text-sm text-sepia-700">
          Canonical drawings reused across your annotations.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

      {loading ? (
        <div className="py-20"><LoadingSpinner /></div>
      ) : symbols.length === 0 ? (
        <div className="py-16 text-center text-sepia-700 font-serif italic">
          No symbols match this filter yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {symbols.map((s) => (
            <Link
              key={s.id}
              to={`/symbols/${s.id}`}
              className="block group bg-parchment-50 border border-sepia-600/30 rounded-md p-2 hover:border-ink-900 transition-colors"
            >
              <div className="aspect-square bg-white rounded border border-sepia-600/20 flex items-center justify-center overflow-hidden">
                <SymbolImage
                  symbolId={s.id}
                  alt={s.content ?? 'symbol'}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="mt-2 text-xs truncate text-ink-900">
                {s.content || <span className="italic text-sepia-700/60">(no content)</span>}
              </div>
              <div className="text-[10px] text-sepia-700/70">
                {s.referenceCount} {s.referenceCount === 1 ? 'use' : 'uses'}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default SymbolsPage;
