import { useEffect, useRef, type ReactNode } from "react";
import { Close } from "@carbon/icons-react";
import { FocusTrap } from "./FocusTrap";

interface ModalProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, description, isOpen, onClose, children }: ModalProps) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-desc" : undefined}
    >
      <FocusTrap active={isOpen}>
        <section className="max-h-[85vh] w-full max-w-lg overflow-hidden border border-border-subtle bg-surface">
          <div className="flex items-start justify-between gap-4 border-b border-border-subtle p-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-text-primary">
                {title}
              </h2>
              {description ? (
                <p id="modal-desc" className="mt-1 text-sm text-text-secondary">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              aria-label="Close"
              onClick={onClose}
            >
              <Close size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="scrollbar-soft max-h-[calc(85vh-5rem)] overflow-y-auto p-4">
            {children}
          </div>
        </section>
      </FocusTrap>
    </div>
  );
}
