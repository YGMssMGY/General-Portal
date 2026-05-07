import { TrashCan, Close } from "@carbon/icons-react";
import type { ReactNode } from "react";

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
    <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-2">
      {selectedCount > 0 ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-text-secondary">
            {selectedCount} selected
          </span>
          <button
            type="button"
            className="flex items-center gap-1.5 border border-border-subtle px-2 py-1 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
            onClick={onClearSelection}
          >
            <Close size={14} aria-hidden="true" />
            Clear
          </button>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
