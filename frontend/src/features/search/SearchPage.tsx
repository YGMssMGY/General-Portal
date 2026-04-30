import { FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useSearch } from "../../hooks/useWorkspaceResources";

const categories = ["All", "Tasks", "Proposals", "Events", "Files", "Finance"];

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "winter formal");
  const [category, setCategory] = useState("All");
  const { data, error, isLoading, refetch } = useSearch(query);

  useEffect(() => {
    const queryParam = searchParams.get("q");
    if (queryParam) {
      setQuery(queryParam);
    }
  }, [searchParams]);

  const filteredResults = useMemo(() => {
    if (!data) return [];
    if (category === "All") return data;
    const singularCategory = category.endsWith("s") ? category.slice(0, -1) : category;
    return data.filter((result) => result.type === singularCategory);
  }, [category, data]);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <Card className="p-8 text-center">
        <h1 className="font-display text-3xl font-bold text-on-surface">Search Workspace</h1>
        <label className="relative mx-auto mt-6 block max-w-2xl">
          <span className="sr-only">Search across workspace</span>
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
          <input
            className="w-full rounded-xl border border-outline-variant bg-surface py-4 pl-12 pr-4 text-base text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search across proposals, tasks, events..."
            type="search"
          />
        </label>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {categories.map((option) => (
            <button
              key={option}
              type="button"
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                category === option
                  ? "border-primary-container bg-primary-container text-on-primary-container"
                  : "border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-variant"
              }`}
              onClick={() => setCategory(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </Card>

      <section>
        <p className="mb-4 text-sm font-medium text-on-surface-variant">
          Showing results for <span className="font-semibold text-on-surface">"{query}"</span>
        </p>
        {isLoading ? <LoadingState label="Searching workspace" /> : null}
        {error ? <ErrorState message={error} onRetry={refetch} /> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {filteredResults.map((result) => (
            <Card key={result.id} className="p-card-padding transition hover:bg-surface-container-low">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-secondary-fixed text-secondary">
                    <FileText className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">{result.type}</span>
                </div>
                <Badge className="bg-surface-container-high text-on-surface-variant">{result.status}</Badge>
              </div>
              <h2 className="font-display text-lg font-semibold text-on-surface">{result.title}</h2>
              <p className="mt-2 text-sm leading-6 text-on-surface-variant">{result.description}</p>
            </Card>
          ))}
        </div>
        {!isLoading && !error && filteredResults.length === 0 ? (
          <p className="rounded-lg border border-outline-variant bg-white p-6 text-sm text-on-surface-variant">
            No results match this category.
          </p>
        ) : null}
      </section>
    </div>
  );
}
