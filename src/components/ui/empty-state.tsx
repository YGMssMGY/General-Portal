import * as React from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
    ({ icon, title, description, action, className }, ref) => (
        <div
            ref={ref}
            className={cn(
                "flex min-h-[200px] flex-col items-center justify-center rounded-[5px] border border-dashed border-[var(--color-border)] p-8 text-center",
                className,
            )}
        >
            {icon && (
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[5px] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
            {description && (
                <p className="mt-2 max-w-md text-sm text-[var(--color-text-secondary)]">
                    {description}
                </p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    ),
);
EmptyState.displayName = "EmptyState";

export { EmptyState };
export default EmptyState;
