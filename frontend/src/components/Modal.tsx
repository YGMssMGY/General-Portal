import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, description, isOpen, onClose, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <section className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-elevated">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant p-5">
          <div>
            <h2 className="font-display text-xl font-semibold text-on-surface">{title}</h2>
            {description ? <p className="mt-1 text-sm text-on-surface-variant">{description}</p> : null}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </section>
    </div>
  );
}
