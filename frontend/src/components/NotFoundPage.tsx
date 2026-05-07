import { Link } from "react-router-dom";
import { Document } from "@carbon/icons-react";

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <Document size={48} className="text-text-secondary" aria-hidden="true" />
      <h1 className="mt-6 text-xl font-semibold text-text-primary">Page not found</h1>
      <p className="mt-2 text-sm text-text-secondary">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 border border-border-subtle bg-surface px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
