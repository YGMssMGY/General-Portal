import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <section className={`rounded-lg border border-outline-variant bg-surface-container-lowest shadow-panel ${className}`}>
      {children}
    </section>
  );
}
