import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Button, Search as CarbonSearch } from "@carbon/react";
import { useSearch } from "../../hooks/useWorkspaceResources";
import { Document } from "@carbon/icons-react";

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
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
          Search Workspace
        </h1>
        <div style={{ marginTop: "1rem" }}>
          <CarbonSearch
            id="workspace-search"
            labelText="Search across workspace"
            placeholder="Search proposals, tasks, events, files..."
            size="lg"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div style={{ marginTop: "1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {categories.map((opt) => (
            <Button
              key={opt}
              kind={category === opt ? "primary" : "ghost"}
              size="sm"
              onClick={() => setCategory(opt)}
            >
              {opt}
            </Button>
          ))}
        </div>
      </Card>

      <section>
        {query ? (
          <p
            style={{
              marginBottom: "1rem",
              fontSize: "0.875rem",
              color: "var(--cds-text-secondary)",
            }}
          >
            Results for{" "}
            <span style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
              &ldquo;{query}&rdquo;
            </span>
          </p>
        ) : null}
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message={error} onRetry={refetch} /> : null}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {filtered.map((result) => (
            <Card key={result.id} padding="lg">
              <div
                style={{
                  marginBottom: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Document
                    size={16}
                    style={{ color: "var(--cds-text-secondary)" }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "var(--cds-text-secondary)",
                    }}
                  >
                    {result.type}
                  </span>
                </div>
                <Badge>{result.status}</Badge>
              </div>
              <h2
                style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}
              >
                {result.title}
              </h2>
              <p
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.875rem",
                  color: "var(--cds-text-secondary)",
                }}
              >
                {result.description}
              </p>
            </Card>
          ))}
        </div>
        {!isLoading && !error && filtered.length === 0 && query ? (
          <p
            style={{
              border: "1px solid var(--cds-border-subtle)",
              background: "var(--cds-layer)",
              padding: "1.5rem",
              fontSize: "0.875rem",
              color: "var(--cds-text-secondary)",
              textAlign: "center",
            }}
          >
            No results found.
          </p>
        ) : null}
      </section>
    </div>
  );
}
