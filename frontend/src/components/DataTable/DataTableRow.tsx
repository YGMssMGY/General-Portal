import type { ColumnDef } from "./DataTable";

interface DataTableRowProps<T> {
  item: T;
  columns: ColumnDef<T>[];
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}

export function DataTableRow<T extends Record<string, unknown>>({
  item,
  columns,
  selectable,
  selected,
  onToggleSelect,
}: DataTableRowProps<T>) {
  return (
    <tr
      className={`border-b border-border-subtle transition-colors ${
        selected ? "bg-surface-selected" : "hover:bg-surface-hover"
      }`}
    >
      {selectable ? (
        <td className="w-10 px-3 py-2.5">
          <input
            type="checkbox"
            className="h-4 w-4 accent-carbon-blue-60"
            checked={selected}
            onChange={onToggleSelect}
            aria-label={`Select row`}
          />
        </td>
      ) : null}
      {columns.map((col) => (
        <td
          key={col.key}
          className={`px-4 py-2.5 text-sm text-text-primary ${col.className ?? ""}`}
        >
          {col.render ? col.render(item) : String(item[col.key] ?? "")}
        </td>
      ))}
    </tr>
  );
}
