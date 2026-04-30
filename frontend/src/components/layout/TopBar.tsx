import { Bell, Menu, Plus, Search } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-topbar-height items-center justify-between border-b border-slate-200 bg-white px-4 md:left-sidebar-width md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <label className="relative hidden w-full max-w-sm sm:block">
          <span className="sr-only">Search workspace</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-outline-variant bg-surface py-2 pl-10 pr-4 text-sm text-on-surface outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Search..."
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-container"
          onClick={() => navigate("/tasks")}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create
        </button>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-primary"
          aria-label="Notifications"
          onClick={() => navigate("/activity")}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-secondary-fixed text-xs font-bold text-secondary">
          {(user?.name ?? "")
            .split(" ")
            .map((part) => part[0])
            .join("")
            .slice(0, 2) || "U"}
        </div>
      </div>
    </header>
  );
}
