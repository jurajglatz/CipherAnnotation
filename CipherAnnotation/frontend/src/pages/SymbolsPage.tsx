/**
 * SymbolsPage Component
 * Cipher symbols library page
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Grid3X3, Search, ImageOff } from 'lucide-react';
import symbolService from '../services/symbolService';
import { Symbol } from '../types';

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

export const SymbolsPage: React.FC = () => {
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    symbolService
      .getSymbols()
      .then((data) => {
        if (!cancelled) setSymbols(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message ?? 'Failed to load symbols');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () =>
      symbols.filter((s) =>
        s.code.toLowerCase().includes(query.toLowerCase())
      ),
    [symbols, query]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-ink-900 leading-tight">
            Cipher <em className="italic font-normal text-sepia-700">Symbols</em>
          </h1>
          <p className="text-ink-900/70 mt-2">
            Browse and manage cipher symbols
          </p>
        </div>
        {!loading && !error && (
          <div className="text-sm text-sepia-700 font-semibold tracking-wider uppercase">
            {symbols.length} {symbols.length === 1 ? 'symbol' : 'symbols'} total
          </div>
        )}
      </div>

      {/* Search bar */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sepia-600" />
        <input
          type="text"
          placeholder="Search symbols by code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm bg-parchment-50/80 border border-sepia-600/30 text-ink-900 placeholder-sepia-600/60 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="bg-parchment-50/80 rounded-lg border border-sepia-600/20 p-3 animate-pulse"
            >
              <div className="w-full h-24 bg-parchment-100 rounded-md mb-3" />
              <div className="h-3 bg-parchment-100 rounded w-2/3 mx-auto" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-cipher-red/5 border border-cipher-red/30 rounded-lg p-8 text-center">
          <p className="text-cipher-red font-semibold">Failed to load symbols</p>
          <p className="text-cipher-red/80 text-sm mt-1">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-parchment-50/80 backdrop-blur-sm border border-sepia-600/20 rounded-lg shadow-sm p-16 text-center">
          <Grid3X3 className="w-14 h-14 text-sepia-600/40 mx-auto mb-4" />
          <p className="text-ink-900 font-serif text-lg">
            {symbols.length === 0
              ? 'No symbols available yet'
              : 'No symbols match your search'}
          </p>
          <p className="text-ink-900/60 text-sm mt-1 italic">
            {symbols.length === 0
              ? 'Symbols created during annotation will appear here.'
              : 'Try a different search term.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filtered.map((symbol) => (
            <div
              key={symbol.id}
              className="group bg-parchment-50/80 backdrop-blur-sm rounded-lg border border-sepia-600/20 overflow-hidden hover:shadow-lg hover:shadow-ink-900/10 hover:border-sepia-600/50 hover:-translate-y-0.5 transition-all duration-200"
              title={symbol.code}
            >
              <div className="w-full h-28 bg-parchment-100 flex items-center justify-center p-2 border-b border-sepia-600/20">
                {symbol.previewImageUrl ? (
                  <img
                    src={symbol.previewImageUrl}
                    alt={symbol.code}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <ImageOff className="w-8 h-8 text-sepia-600/40" />
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="text-sm font-mono font-semibold text-ink-900 truncate text-center">
                  {symbol.code}
                </p>
                <p className="text-xs text-sepia-700/80 text-center mt-0.5 italic">
                  {formatDate(symbol.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SymbolsPage;
