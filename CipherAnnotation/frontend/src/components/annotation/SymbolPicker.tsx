/**
 * SymbolPicker Component
 * Symbol selection component with search and preview
 */

import React, { useState, useMemo } from 'react';
import { Search, Plus } from 'lucide-react';
import { Symbol } from '@/types';

interface SymbolPickerProps {
  selectedSymbolId: string | undefined;
  onSelect: (symbolId: string) => void;
  symbols: Symbol[];
  onCreateNew?: () => void;
}

export const SymbolPicker: React.FC<SymbolPickerProps> = ({
  selectedSymbolId,
  onSelect,
  symbols,
  onCreateNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter symbols by code
  const filteredSymbols = useMemo(() => {
    return symbols.filter((symbol) =>
      symbol.code.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [symbols, searchQuery]);

  // Get selected symbol for preview
  const selectedSymbol = symbols.find((s) => s.id === selectedSymbolId);

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search symbols..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Preview */}
      {selectedSymbol && selectedSymbol.previewImageUrl && (
        <div className="border border-gray-300 rounded-md p-3">
          <p className="text-xs text-gray-600 mb-2">Preview</p>
          <img
            src={selectedSymbol.previewImageUrl}
            alt={selectedSymbol.code}
            className="w-full h-20 object-contain"
          />
          <p className="text-center text-sm font-medium mt-2">
            {selectedSymbol.code}
          </p>
        </div>
      )}

      {/* Symbol grid */}
      <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
        {filteredSymbols.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">No symbols found</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filteredSymbols.map((symbol) => (
              <button
                key={symbol.id}
                onClick={() => onSelect(symbol.id)}
                className={`p-2 rounded border-2 transition-all ${
                  selectedSymbolId === symbol.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                title={symbol.code}
              >
                {symbol.previewImageUrl ? (
                  <img
                    src={symbol.previewImageUrl}
                    alt={symbol.code}
                    className="w-full h-16 object-contain"
                  />
                ) : (
                  <div className="w-full h-16 flex items-center justify-center bg-gray-100 rounded">
                    <span className="text-xs text-gray-600">{symbol.code}</span>
                  </div>
                )}
                <p className="text-xs text-center mt-1 truncate">
                  {symbol.code}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Create new button */}
      {onCreateNew && (
        <button
          onClick={onCreateNew}
          className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
        >
          <Plus className="w-4 h-4" />
          Create New Symbol
        </button>
      )}
    </div>
  );
};

export default SymbolPicker;
