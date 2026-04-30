import type { Priority, ResourceStatus } from "../types";

export function priorityBadgeClass(priority: Priority): string {
  const classes: Record<Priority, string> = {
    low: "bg-surface-container-high text-on-surface-variant",
    normal: "bg-surface-container-highest text-on-surface",
    medium: "bg-tertiary-container text-on-tertiary-container",
    high: "bg-error-container text-on-error-container"
  };

  return classes[priority];
}

export function statusBadgeClass(status: ResourceStatus): string {
  const classes: Record<ResourceStatus, string> = {
    draft: "bg-surface-container-high text-on-surface-variant",
    pending: "bg-tertiary-fixed text-tertiary",
    under_review: "bg-secondary-fixed text-secondary",
    approved: "bg-primary text-on-primary",
    rejected: "bg-error text-on-error",
    active: "bg-primary-container text-on-primary-container",
    completed: "bg-primary text-on-primary",
    blocked: "bg-error-container text-on-error-container"
  };

  return classes[status];
}

export function progressWidthClass(progress: number): string {
  if (progress >= 100) return "w-full";
  if (progress >= 90) return "w-11/12";
  if (progress >= 75) return "w-3/4";
  if (progress >= 66) return "w-2/3";
  if (progress >= 50) return "w-1/2";
  if (progress >= 33) return "w-1/3";
  if (progress >= 25) return "w-1/4";
  if (progress > 0) return "w-1/6";
  return "w-0";
}
