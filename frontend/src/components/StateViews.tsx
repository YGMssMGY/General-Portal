interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading data" }: LoadingStateProps) {
  return (
    <div className="flex min-h-48 items-center justify-center border border-border-subtle bg-surface p-8 text-sm text-text-secondary">
      <div className="h-5 w-5 animate-skeleton-pulse rounded-full border-2 border-border-interactive border-t-transparent" />
      <span className="ml-3">{label}</span>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="border-l-4 border-danger bg-surface p-4">
      <p className="text-sm font-semibold text-text-primary">Could not load data</p>
      <p className="mt-1 text-sm text-text-secondary">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="border border-border-subtle bg-surface p-8 text-center">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 text-sm text-text-secondary">{description}</p>
    </div>
  );
}
