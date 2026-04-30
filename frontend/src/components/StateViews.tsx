import { AlertCircle, Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading workspace data" }: { label?: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest text-sm text-on-surface-variant">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-error-container bg-error-container/30 p-5 text-sm text-on-error-container">
      <div className="flex items-center gap-2 font-semibold">
        <AlertCircle className="h-4 w-4" aria-hidden="true" />
        Could not load data
      </div>
      <p className="mt-2">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded border border-error/30 bg-white px-3 py-2 text-sm font-medium text-on-error-container hover:bg-error-container"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant bg-surface p-8 text-center">
      <h2 className="font-display text-lg font-semibold text-on-surface">{title}</h2>
      <p className="mt-2 text-sm text-on-surface-variant">{description}</p>
    </div>
  );
}
