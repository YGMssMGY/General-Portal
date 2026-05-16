import { useCallback } from "react";
import { TableRow, TableCell, TableSelectRow } from "@carbon/react";
import type { ColumnDef } from "./DataTable";

interface DataTableRowProps<T> {
  item: T;
  columns: ColumnDef<T>[];
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onRowClick?: () => void;
}

export function DataTableRow<T extends Record<string, unknown>>({
  item,
  columns,
  selectable,
  selected,
  onToggleSelect,
  onRowClick,
}: DataTableRowProps<T>) {
  const handleClick = useCallback(() => {
    if (onRowClick) onRowClick();
  }, [onRowClick]);

  return (
    <TableRow
      isSelected={selected}
      onClick={handleClick}
      style={onRowClick ? { cursor: "pointer" } : undefined}
    >
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
