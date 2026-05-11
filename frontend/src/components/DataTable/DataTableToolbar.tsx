import { Close } from "@carbon/icons-react";
import type { ReactNode } from "react";
import { TableToolbar, TableToolbarContent, Button } from "@carbon/react";

interface DataTableToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  children: ReactNode;
}

export function DataTableToolbar({
  selectedCount,
  onClearSelection,
  children,
}: DataTableToolbarProps) {
  return (
    <TableToolbar>
      <TableToolbarContent>
        {selectedCount > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
              {selectedCount} selected
            </span>
            <Button kind="ghost" size="sm" onClick={onClearSelection} renderIcon={Close}>
              Clear
            </Button>
            {children}
          </div>
        ) : (
          children
        )}
      </TableToolbarContent>
    </TableToolbar>
  );
}
