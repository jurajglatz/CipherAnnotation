/**
 * Pagination Component
 * Page navigation with prev/next, numeric buttons, and optional page size selector.
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
}

const buildPageList = (current: number, total: number): (number | 'ellipsis')[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push('ellipsis');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);

  return pages;
};

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [12, 24, 48, 96],
  itemLabel = 'items',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const clampedPage = Math.min(currentPage, totalPages);
  const from = totalItems === 0 ? 0 : (clampedPage - 1) * pageSize + 1;
  const to = Math.min(clampedPage * pageSize, totalItems);
  const pageList = buildPageList(clampedPage, totalPages);

  const baseBtn =
    'inline-flex items-center justify-center min-w-[2.25rem] h-9 px-2 rounded-md border text-sm font-semibold transition-colors';
  const inactiveBtn =
    'bg-transparent border-sepia-600/30 text-ink-900 hover:border-ink-900/60 disabled:opacity-40 disabled:hover:border-sepia-600/30';
  const activeBtn = 'bg-ink-900 border-ink-900 text-parchment-50 shadow-sm';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-6">
      <p className="text-sm text-ink-900/60">
        Showing <span className="font-semibold text-ink-900">{from}</span>–
        <span className="font-semibold text-ink-900">{to}</span> of{' '}
        <span className="font-semibold text-ink-900">{totalItems}</span> {itemLabel}
      </p>

      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-9 px-2 bg-parchment-50/80 border border-sepia-600/30 text-ink-900 rounded-md focus:outline-none focus:border-ink-900 focus:ring-1 focus:ring-ink-900 transition-colors text-sm"
            aria-label="Items per page"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} / page
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(clampedPage - 1)}
            disabled={clampedPage <= 1}
            aria-label="Previous page"
            className={`${baseBtn} ${inactiveBtn}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pageList.map((p, idx) =>
            p === 'ellipsis' ? (
              <span
                key={`e-${idx}`}
                className="inline-flex items-center justify-center min-w-[2.25rem] h-9 text-ink-900/50 text-sm"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === clampedPage ? 'page' : undefined}
                className={`${baseBtn} ${p === clampedPage ? activeBtn : inactiveBtn}`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(clampedPage + 1)}
            disabled={clampedPage >= totalPages}
            aria-label="Next page"
            className={`${baseBtn} ${inactiveBtn}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
