"use client";

import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Search as SearchIcon, FileText, Calendar, ClipboardList, User, File, ExternalLink, Video } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  type: "tasks" | "events" | "proposals" | "members" | "files" | "meetings";
  url: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

const typeConfig: Record<string, { icon: typeof FileText; color: string; bg: string }> = {
  tasks: { icon: ClipboardList, color: "var(--color-primary)", bg: "var(--color-primary-light)" },
  events: { icon: Calendar, color: "var(--color-success)", bg: "#e8f5e9" },
  proposals: { icon: FileText, color: "var(--color-warning)", bg: "#fff8e1" },
  members: { icon: User, color: "var(--color-text)", bg: "var(--color-bg-secondary)" },
  files: { icon: File, color: "var(--color-text-secondary)", bg: "var(--color-bg-secondary)" },
  meetings: { icon: Video, color: "var(--color-success)", bg: "#e8f5e9" },
};

const btnBase: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  backgroundColor: "transparent",
  color: "var(--color-text-secondary)",
  transition: "background-color 100ms ease",
  minHeight: "32px",
};

export default function SearchPage() {
  const portal = getPortal();
  usePageTitle("Search | General Portal");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setDebounced(value.trim());
      }, 300);
    },
    []
  );

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: [portal, "search", debounced],
    queryFn: () => fetchJson(`/api/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length > 0,
  });

  const results = data?.results ?? [];

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div>
      <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 20px", color: "var(--color-text)" }}>
        Search
      </h1>

      <div style={{ position: "relative", marginBottom: "20px" }}>
        <SearchIcon
          size={18}
          style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--color-text-secondary)",
            pointerEvents: "none",
          }}
        />
        <input
          style={{
            width: "100%",
            padding: "12px 14px 12px 42px",
            fontSize: "16px",
            border: "2px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text)",
            fontFamily: "inherit",
            outline: "none",
          }}
          placeholder="Search across the portal..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          autoFocus
        />
      </div>

      {isLoading && (
        <div style={{ color: "var(--color-text-secondary)", fontSize: "14px", padding: "24px 0" }}>
          Searching...
        </div>
      )}

      {!isLoading && debounced.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "64px 16px",
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          <SearchIcon size={40} style={{ marginBottom: "16px", opacity: 0.3 }} />
          <p style={{ margin: 0, fontSize: "16px" }}>Search across the portal...</p>
          <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
            Find tasks, events, proposals, members, and files.
          </p>
        </div>
      )}

      {!isLoading && debounced.length > 0 && results.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          <p style={{ margin: 0 }}>
            No results found for <strong>{debounced}</strong>.
          </p>
        </div>
      )}

      {!isLoading && results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
            {data?.total ?? results.length} result{(data?.total ?? results.length) !== 1 ? "s" : ""} for "{debounced}"
          </p>
          {Object.entries(grouped).map(([type, items]) => {
            const cfg = typeConfig[type] ?? typeConfig.tasks;
            const Icon = cfg.icon;
            return (
              <div key={type}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  <Icon size={16} color={cfg.color} />
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      margin: 0,
                      color: "var(--color-text)",
                      textTransform: "capitalize",
                    }}
                  >
                    {type}
                  </h3>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    ({items.length})
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {items.map((item) => (
                    <a
                      key={`${item.type}-${item.id}`}
                      href={item.url}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-bg)",
                        textDecoration: "none",
                        transition: "background-color 100ms ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-bg)";
                      }}
                    >
                      <div
                        style={{
                          padding: "4px 8px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: cfg.color,
                          backgroundColor: cfg.bg,
                          textTransform: "capitalize",
                          flexShrink: 0,
                        }}
                      >
                        {type === "members" ? "Member" : type.slice(0, -1)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.title}
                        </div>
                        {item.snippet && (
                          <div
                            style={{
                              fontSize: "13px",
                              color: "var(--color-text-secondary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginTop: "2px",
                            }}
                          >
                            {item.snippet}
                          </div>
                        )}
                      </div>
                      <ExternalLink size={14} color="var(--color-text-secondary)" style={{ flexShrink: 0 }} />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
