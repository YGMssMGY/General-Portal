import type { ReactNode } from "react";
import { Tag } from "@carbon/react";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <Tag className={className} type="outline">
      {children}
    </Tag>
  );
}
