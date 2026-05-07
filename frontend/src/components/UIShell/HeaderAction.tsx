import type { ReactNode } from "react";

interface HeaderActionProps {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  isActive?: boolean;
}

export function HeaderAction({ label, onClick, children, isActive }: HeaderActionProps) {
  return (
    <button
      type="button"
      className={`flex h-12 w-12 items-center justify-center border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${
        isActive
          ? "border-border-interactive text-text-primary"
          : "border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary"
      }`}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
