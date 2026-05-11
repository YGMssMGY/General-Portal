import { type ReactNode } from "react";
import { ComposedModal, ModalHeader, ModalBody } from "@carbon/react";

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
    <ComposedModal open={isOpen} onClose={onClose} aria-label={title}>
      <ModalHeader label={description} title={title} />
      <ModalBody>{children}</ModalBody>
    </ComposedModal>
  );
}
