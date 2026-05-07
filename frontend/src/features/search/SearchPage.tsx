import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useSearch } from "../../hooks/useWorkspaceResources";
import { Search, Document } from "@carbon/icons-react";

const categories = ["All", "Tasks", "Proposals", "Events", "Files", "Finance"];

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState("All");
  const { data, error, isLoading, refetch } = useSearch(query);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setQuery(q);
  }, [searchParams]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (category === "All") return data;
    const singular = category.endsWith("s") ? category.slice(0, -1) : category;
    return data.filter((r) => r.type === singular);
  }, [category, data]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card padding="lg">
        <h1 className="text-xl font-semibold text-text-primary font-condensed">Search Workspace</h1>
        <label className="relative mt-4 block">
          <span className="sr-only">Search across workspace</span>
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
          <input
            className="w-full border border-border-subtle bg-surface py-2.5 pl-10 pr-4 text-sm text-text-primary outline-none placeholder:text-text-placeholder focus:border-border-interactive focus:ring-1 focus:ring-border-interactive"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search proposals, tasks, events, files..."
            type="search"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                category === opt
                  ? "bg-carbon-blue-60 text-white"
                  : "border border-border-subtle text-text-secondary hover:bg-surface-hover"
              }`}
              onClick={() => setCategory(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </Card>

      <section>
        {query ? (
          <p className="mb-4 text-sm text-text-secondary">
            Results for <span className="font-medium text-text-primary">&ldquo;{query}&rdquo;</span>
          </p>
        ) : null}
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={refetch} /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((result) => (
            <Card key={result.id} padding="lg">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Document size={16} className="text-text-secondary" aria-hidden="true" />
                  <span className="text-xs font-semibold uppercase text-text-secondary">{result.type}</span>
                </div>
                <Badge className="border-border-subtle bg-surface text-text-secondary">{result.status}</Badge>
              </div>
              <h2 className="text-lg font-semibold text-text-primary">{result.title}</h2>
              <p className="mt-2 text-sm text-text-secondary">{result.description}</p>
            </Card>
          ))}
        </div>
        {!isLoading && !error && filtered.length === 0 && query ? (
          <p className="border border-border-subtle bg-surface p-6 text-sm text-text-secondary text-center">
            No results found.
          </p>
        ) : null}
      </section>
    </div>
  );
}
