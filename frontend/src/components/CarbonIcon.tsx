import { createElement, type ComponentType } from "react";
import {
  Activity,
  Add,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Asleep,
  Calendar,
  Chat,
  Checkmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Close,
  Dashboard,
  Document,
  Download,
  Edit,
  Error,
  Filter,
  Folder,
  Group,
  Information,
  Launch,
  Light,
  Menu,
  Money,
  OverflowMenuVertical,
  Search,
  Settings,
  Task,
  TrashCan,
  User,
  Warning,
} from "@carbon/icons-react";

const iconMap: Record<string, ComponentType<any>> = {
  Activity,
  Add,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calendar,
  Chat,
  Checkmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Close,
  Dashboard,
  Document,
  Download,
  Edit,
  Error,
  Filter,
  Folder,
  Group,
  Information,
  Launch,
  Menu,
  Money,
  OverflowMenuVertical,
  Search,
  Settings,
  Task,
  TrashCan,
  User,
  Warning,
  Asleep,
  Light,
};

export type CarbonIconName = keyof typeof iconMap;

interface CarbonIconProps {
  name: CarbonIconName;
  size?: number;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
  "aria-label"?: string;
}

export function CarbonIcon({ name, size = 20, ...props }: CarbonIconProps) {
  const Component = iconMap[name];
  if (!Component) {
    console.warn(`CarbonIcon: Unknown icon "${name}"`);
    return null;
  }
  return createElement(Component, { size, ...props });
}
