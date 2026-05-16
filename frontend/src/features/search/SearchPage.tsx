import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as CarbonSearch, Tag, Tile } from "@carbon/react";
import { Task, Document, Calendar, Folder, Money, Result } from "@carbon/icons-react";
import { ErrorState, LoadingState, EmptyState } from "../../components/StateViews";
import { useSearch } from "../../hooks/useWorkspaceResources";
import { Badge } from "../../components/Badge";

const categories = ["All", "Tasks", "Proposals", "Events", "Files", "Finance"];

const typeMeta: Record<
  string,
  { icon: typeof Task; color: string; tagType: "green" | "magenta" | "blue" | "warm-gray" | "teal" }
> = {
  Task: { icon: Task, color: "#198038", tagType: "green" },
  Proposal: { icon: Document, color: "#8a3ffc", tagType: "magenta" },
  Event: { icon: Calendar, color: "#0f62fe", tagType: "blue" },
  File: { icon: Folder, color: "#ff832b", tagType: "warm-gray" },
  Finance: { icon: Money, color: "#007d79", tagType: "teal" },
};

function getTypeMeta(type: string) {
  const key = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  return (
    typeMeta[key] ?? {
      icon: Result,
      color: "var(--cds-text-secondary)",
      tagType: "cool-gray" as const,
    }
  );
}

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [category, setCategory] = useState("All");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const { data, error, isLoading, refetch } = useSearch(
    debouncedQuery,
    category === "All" ? undefined : category,
  );

  // Debounce: wait 300ms after last keystroke
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Sync URL param on mount
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
      setDebouncedQuery(q);
    }
  }, [searchParams]);

  const showLoading = isLoading && debouncedQuery.length > 0;

  return (
    <div>
      {/* Search Hero */}
      <div
        style={{
          background: "var(--cds-layer-02)",
          borderBottom: "1px solid var(--cds-border-subtle)",
          padding: "2.5rem 1.5rem",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 600,
            color: "var(--cds-text-primary)",
            marginBottom: "1rem",
          }}
        >
          Search Workspace
        </h1>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <CarbonSearch
            id="workspace-search"
            labelText="Search across workspace"
            placeholder="Search proposals, tasks, events, files, finance..."
            size="lg"
            value={query}
            onChange={(e: any) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        {/* Category filter pills */}
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            justifyContent: "center",
          }}
        >
          {categories.map((opt) => {
            const active = category === opt;
            return (
              <Tag
                key={opt}
                size="md"
                role="button"
                tabIndex={0}
                type={active ? "blue" : "cool-gray"}
                onClick={() => setCategory(opt)}
                onKeyDown={(e: any) => {
                  if (e.key === "Enter" || e.key === " ") setCategory(opt);
                }}
                style={{
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                {opt}
              </Tag>
            );
          })}
        </div>
      </div>

      {/* Results section */}
      <div style={{ padding: "0 1.5rem" }}>
        {/* Result count */}
        {debouncedQuery ? (
          <p
            style={{
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "var(--cds-text-secondary)",
            }}
          >
            {showLoading
              ? "Searching..."
              : data
                ? `Showing results for "${debouncedQuery}"${category !== "All" ? ` in ${category}` : ""} (${data.length} result${data.length !== 1 ? "s" : ""})`
                : `Searching for "${debouncedQuery}"...`}
          </p>
        ) : (
          <p
            style={{
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "var(--cds-text-secondary)",
            }}
          >
            Enter a search term above to find workspace resources.
          </p>
        )}

        {/* Loading state */}
        {showLoading ? <LoadingState label="Searching..." /> : null}

        {/* Error state */}
        {error ? <ErrorState message={error} onRetry={refetch} /> : null}

        {/* Results grid */}
        {!showLoading && !error && data && data.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: "1rem",
            }}
          >
            {data.map((result) => {
              const meta = getTypeMeta(result.type);
              const Icon = meta.icon;
              return (
                <Tile
                  key={result.id}
                  style={{
                    padding: "1.25rem",
                    cursor: "default",
                    borderLeft: `3px solid ${meta.color}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Icon size={18} style={{ color: meta.color }} aria-hidden="true" />
                      <Tag type={meta.tagType}>{result.type}</Tag>
                    </div>
                    <Badge>{result.status}</Badge>
                  </div>
                  <h2
                    style={{
                      fontSize: "1rem",
                      fontWeight: 600,
                      color: "var(--cds-text-primary)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    {result.title}
                  </h2>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--cds-text-secondary)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      lineHeight: "1.4",
                    }}
                  >
                    {result.description}
                  </p>
                </Tile>
              );
            })}
          </div>
        ) : null}

        {/* Empty state */}
        {!showLoading && !error && debouncedQuery && data && data.length === 0 ? (
          <EmptyState
            title="No results found"
            description={`No results for "${debouncedQuery}"${category !== "All" ? ` in ${category}` : ""}. Try different keywords or filters.`}
          />
        ) : null}
      </div>
    </div>
  );
}
