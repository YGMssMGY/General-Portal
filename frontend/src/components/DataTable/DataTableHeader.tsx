import { ArrowUp, ArrowDown } from "@carbon/icons-react";
import type { ColumnDef } from "./DataTable";

interface DataTableHeaderProps<T> {
  columns: ColumnDef<T>[];
  sortKey: string | null;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  selectable: boolean;
  onToggleAll: () => void;
  allSelected: boolean;
}

export function DataTableHeader<T>({
  columns,
  sortKey,
  sortDir,
  onSort,
  selectable,
  onToggleAll,
  allSelected,
}: DataTableHeaderProps<T>) {
  return (
    <thead className="border-b border-border-subtle">
      <tr>
        {selectable ? (
          <th className="w-10 px-3 py-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-carbon-blue-60"
              checked={allSelected}
              onChange={onToggleAll}
              aria-label="Select all rows"
            />
          </th>
        ) : null}
        {columns.map((col) => (
          <th
            key={col.key}
            className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary ${
              col.sortable ? "cursor-pointer select-none hover:text-text-primary" : ""
            } ${col.className ?? ""}`}
            onClick={() => {
              if (col.sortable) onSort(col.key);
            }}
            aria-sort={sortKey === col.key ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
            scope="col"
          >
            <span className="inline-flex items-center gap-1">
              {col.header}
              {col.sortable && sortKey === col.key ? (
                sortDir === "asc" ? (
                  <ArrowUp size={12} aria-hidden="true" />
                ) : (
                  <ArrowDown size={12} aria-hidden="true" />
                )
              ) : null}
            </span>
          </th>
        ))}
      </tr>
    </thead>
  );
}
