import { ChevronLeft, ChevronRight } from "@carbon/icons-react";

interface DataTablePaginationProps {
  start: number;
  end: number;
  total: number;
  page: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function DataTablePagination({
  start,
  end,
  total,
  page,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle px-4 py-2">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          Items per page:
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="border border-border-subtle bg-surface px-2 py-1 text-xs text-text-primary outline-none focus:border-border-interactive"
          >
            {[10, 20, 30].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-text-secondary">
          {start}&ndash;{end} of {total} items
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center border border-border-subtle text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 7) {
            pageNum = i + 1;
          } else if (page <= 4) {
            pageNum = i + 1;
          } else if (page >= totalPages - 3) {
            pageNum = totalPages - 6 + i;
          } else {
            pageNum = page - 3 + i;
          }
          return (
            <button
              key={pageNum}
              type="button"
              className={`flex h-8 w-8 items-center justify-center border text-xs font-medium transition-colors ${
                pageNum === page
                  ? "border-border-interactive bg-surface-selected text-text-primary"
                  : "border-border-subtle text-text-secondary hover:bg-surface-hover"
              }`}
              onClick={() => onPageChange(pageNum)}
              aria-label={`Page ${pageNum}`}
              aria-current={pageNum === page ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          type="button"
          disabled={page >= totalPages}
          className="flex h-8 w-8 items-center justify-center border border-border-subtle text-text-secondary hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
