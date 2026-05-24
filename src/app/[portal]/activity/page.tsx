"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import {
  Activity,
  PlusCircle,
  Edit3,
  Trash2,
  UserPlus,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface ActivityItem {
  id: string;
  type: "create" | "update" | "delete" | "signup" | "complete" | "other";
  entityType: string;
  description: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
}

const entityTypes = ["all", "tasks", "events", "proposals", "files", "meetings", "volunteers"];

const typeIcons: Record<string, typeof Activity> = {
  create: PlusCircle,
  update: Edit3,
  delete: Trash2,
  signup: UserPlus,
  complete: CheckCircle,
  other: AlertCircle,
};

const typeColors: Record<string, string> = {
  create: "var(--color-success)",
  update: "var(--color-primary)",
  delete: "var(--color-destructive)",
  signup: "var(--color-warning)",
  complete: "var(--color-success)",
  other: "var(--color-text-secondary)",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

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
  transition: "background-color 100ms ease, color 100ms ease",
  minHeight: "32px",
};

export default function ActivityPage() {
  const portal = getPortal();
  usePageTitle("Activity | General Portal");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = useQuery<{ items: ActivityItem[]; total: number }>({
    queryKey: [portal, "activity", filter, page],
    queryFn: () =>
      fetchJson(
        `/api/activity?entityType=${filter === "all" ? "" : filter}&page=${page}&pageSize=${pageSize}`
      ),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
          Activity Feed
        </h1>
      </div>

      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {entityTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => { setFilter(type); setPage(1); }}
            style={{
              ...btnBase,
              backgroundColor: filter === type ? "var(--color-primary)" : "transparent",
              color: filter === type ? "#fff" : "var(--color-text-secondary)",
              borderColor: filter === type ? "var(--color-primary)" : "var(--color-border)",
              textTransform: "capitalize",
            }}
          >
            {type === "all" ? "All" : type}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>
      ) : items.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          <Activity size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No activity recorded yet.</p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {items.map((item) => {
              const Icon = typeIcons[item.type] ?? Activity;
              const color = typeColors[item.type] ?? "var(--color-text-secondary)";
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg)",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-bg-secondary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: color,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", color: "var(--color-text)", lineHeight: 1.4 }}>
                      <strong>{item.userName}</strong>{" "}
                      <span style={{ color: "var(--color-text-secondary)" }}>{item.description}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                        {relativeTime(item.timestamp)}
                      </span>
                      <span
                        style={{
                          padding: "1px 5px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--color-primary)",
                          backgroundColor: "var(--color-primary-light)",
                          textTransform: "capitalize",
                        }}
                      >
                        {item.entityType}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                style={{ ...btnBase, opacity: page <= 1 ? 0.4 : 1 }}
              >
                Previous
              </button>
              <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                style={{ ...btnBase, opacity: page >= totalPages ? 0.4 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
