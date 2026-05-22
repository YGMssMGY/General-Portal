import type { Priority, ResourceStatus } from "../types";

export function priorityBadgeClass(priority: Priority): string {
    const classes: Record<Priority, string> = {
        low: "border-border-subtle bg-surface text-text-secondary",
        medium: "border-carbon-yellow-30 bg-carbon-yellow-10 text-carbon-yellow-50",
        high: "border-carbon-red-30 bg-carbon-red-10 text-carbon-red-60",
    };
    return classes[priority];
}

export function statusBadgeClass(status: ResourceStatus): string {
    const classes: Record<ResourceStatus, string> = {
        draft: "border-border-subtle bg-surface text-text-secondary",
        submitted: "border-carbon-purple-30 bg-carbon-purple-10 text-carbon-purple-60",
        pending: "border-carbon-yellow-30 bg-carbon-yellow-10 text-carbon-yellow-50",
        under_review: "border-carbon-teal-30 bg-carbon-teal-10 text-carbon-teal-60",
        approved: "border-carbon-green-30 bg-carbon-green-10 text-carbon-green-60",
        rejected: "border-carbon-red-30 bg-carbon-red-10 text-carbon-red-60",
        active: "border-carbon-blue-30 bg-carbon-blue-10 text-carbon-blue-60",
        completed: "border-carbon-green-30 bg-carbon-green-10 text-carbon-green-60",
        blocked: "border-carbon-red-30 bg-carbon-red-10 text-carbon-red-60",
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
