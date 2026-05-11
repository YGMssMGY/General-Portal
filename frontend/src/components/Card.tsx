import type { ReactNode } from "react";
import { Tile } from "@carbon/react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return <Tile className={className}>{children}</Tile>;
}
