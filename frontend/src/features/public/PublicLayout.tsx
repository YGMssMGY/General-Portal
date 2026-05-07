import { Outlet, Link } from "react-router-dom";
import { CarbonIcon } from "../../components/CarbonIcon";

export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-6">
          <Link to="/" className="flex items-center gap-3 text-text-primary hover:text-text-primary">
            <div className="flex h-8 w-8 items-center justify-center bg-carbon-blue-60 text-sm font-semibold text-white">
              CP
            </div>
            <span className="text-lg font-semibold font-condensed">Club Portal</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Home
            </Link>
            <Link
              to="/events"
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Events
            </Link>
            <Link
              to="/photos"
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Photos
            </Link>
            <Link
              to="/about"
              className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              About
            </Link>
            <Link
              to="/admin"
              className="ml-2 flex items-center gap-1.5 border border-border-interactive px-3 py-1.5 text-sm font-medium text-border-interactive hover:bg-carbon-blue-10 transition-colors"
            >
              <CarbonIcon name="Launch" size={14} aria-hidden="true" />
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-border-subtle bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
          <p className="text-sm text-text-secondary">
            &copy; {new Date().getFullYear()} Developers' Club &amp; Student Council. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
