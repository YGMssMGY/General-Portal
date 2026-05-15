import type { ReactNode } from "react";
import { Tile } from "@carbon/react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}

const paddingMap = { sm: "1rem", md: "1.5rem", lg: "2rem" };

export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <Tile className={className} style={{ padding: paddingMap[padding] }}>
      {children}
    </Tile>
  );
}
