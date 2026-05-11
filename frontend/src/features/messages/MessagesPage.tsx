import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useMessageThreads } from "../../hooks/useWorkspaceResources";
import type { MessageThread } from "../../types";
import { formatDateTime, sentenceCase } from "../../utils/format";
import { Tag, Button } from "@carbon/react";

export function MessagesPage() {
  const { data, error, isLoading, refetch } = useMessageThreads();
  const [selectedId, setSelectedId] = useState<string>();
  const [contextFilter, setContextFilter] = useState<"all" | "event" | "task">("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((t) => contextFilter === "all" || t.context === contextFilter);
  }, [data, contextFilter]);

  const selected = useMemo<MessageThread | undefined>(() => {
    if (!filtered.length) return undefined;
    return filtered.find((t) => t.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Messages unavailable"} onRetry={refetch} />;

  const sidebarStyle: React.CSSProperties = {
    border: "1px solid var(--cds-border-subtle)",
    background: "var(--cds-layer)",
    display: "grid",
    gridTemplateColumns: "320px 1fr 260px",
    minHeight: "calc(100vh - 6rem)",
  };

  return (
    <div style={sidebarStyle}>
      <aside style={{ borderRight: "1px solid var(--cds-border-subtle)" }}>
        <div style={{ borderBottom: "1px solid var(--cds-border-subtle)", padding: "1rem" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            Messages
          </h1>
          <p
            style={{
              marginTop: "0.25rem",
              fontSize: "0.875rem",
              color: "var(--cds-text-secondary)",
            }}
          >
            Conversations linked to workspace resources.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            borderBottom: "1px solid var(--cds-border-subtle)",
            padding: "0.75rem",
          }}
        >
          {(["all", "event", "task"] as const).map((f) => (
            <Button
              key={f}
              kind={contextFilter === f ? "primary" : "ghost"}
              size="sm"
              onClick={() => setContextFilter(f)}
            >
              {f === "all" ? "All" : f === "event" ? "Events" : "Tasks"}
            </Button>
          ))}
        </div>
        <div className="scrollbar-soft" style={{ maxHeight: "600px", overflowY: "auto" }}>
          {filtered.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => setSelectedId(thread.id)}
              style={{
                width: "100%",
                borderBottom: "1px solid var(--cds-border-subtle)",
                padding: "1rem",
                textAlign: "left",
                borderLeft:
                  selected?.id === thread.id
                    ? "3px solid var(--cds-border-interactive)"
                    : "3px solid transparent",
                background:
                  selected?.id === thread.id ? "var(--cds-layer-selected)" : "transparent",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  marginBottom: "0.25rem",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <h2 style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                  {thread.title}
                </h2>
                <span style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                  {formatDateTime(thread.updatedAt)}
                </span>
              </div>
              <p
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontSize: "0.875rem",
                  color: "var(--cds-text-secondary)",
                }}
              >
                {thread.preview}
              </p>
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Badge>{sentenceCase(thread.status)}</Badge>
                {thread.unreadCount > 0 ? <Tag type="blue">{thread.unreadCount}</Tag> : null}
              </div>
            </button>
          ))}
          {filtered.length === 0 ? (
            <p
              style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}
            >
              No threads match this filter.
            </p>
          ) : null}
        </div>
      </aside>

      <section style={{ display: "flex", flexDirection: "column", minHeight: "500px" }}>
        <div style={{ borderBottom: "1px solid var(--cds-border-subtle)", padding: "1rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            {selected?.title}
          </h2>
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
            {selected?.participants.join(", ")}
          </p>
        </div>
        <div
          className="scrollbar-soft"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {selected?.messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                maxWidth: "36rem",
                border: "1px solid var(--cds-border-subtle)",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  marginBottom: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: "0.875rem",
                }}
              >
                <span style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                  {msg.authorName}
                </span>
                <span style={{ color: "var(--cds-text-secondary)" }}>
                  {formatDateTime(msg.sentAt)}
                </span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>{msg.body}</p>
            </div>
          ))}
        </div>
      </section>

      <aside
        style={{
          borderLeft: "1px solid var(--cds-border-subtle)",
          padding: "1rem",
          display: "block",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
          Context
        </h2>
        <dl
          style={{
            marginTop: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.875rem",
          }}
        >
          <div>
            <dt style={{ color: "var(--cds-text-secondary)" }}>Type</dt>
            <dd
              style={{
                fontWeight: 500,
                textTransform: "capitalize",
                color: "var(--cds-text-primary)",
              }}
            >
              {selected?.context}
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--cds-text-secondary)" }}>Status</dt>
            <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
              {selected ? sentenceCase(selected.status) : ""}
            </dd>
          </div>
          <div>
            <dt style={{ color: "var(--cds-text-secondary)" }}>Unread</dt>
            <dd style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
              {selected?.unreadCount ?? 0}
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
