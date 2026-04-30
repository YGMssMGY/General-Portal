import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high">
        <FileQuestion className="h-8 w-8 text-on-surface-variant" />
      </div>
      <h1 className="mt-6 font-display text-xl font-semibold text-on-surface">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary-container"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}