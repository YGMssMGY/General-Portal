import { TableRow, TableCell, TableSelectRow } from "@carbon/react";
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
    <TableRow isSelected={selected}>
      {selectable ? (
        <TableSelectRow
          id={`row-${String(item.id)}`}
          name={`row-${String(item.id)}`}
          checked={selected}
          onSelect={onToggleSelect}
          aria-label="Select row"
        />
      ) : null}
      {columns.map((col) => (
        <TableCell key={col.key}>
          {col.render ? col.render(item) : String(item[col.key] ?? "")}
        </TableCell>
      ))}
    </TableRow>
  );
}
