"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Bell, CheckCheck, ExternalLink, Circle } from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

const btnBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "var(--radius-sm)",
  border: "none",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: "36px",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "background-color 100ms ease",
};

export default function NotificationsPage() {
  const portal = getPortal();
  const qc = useQueryClient();

  const { data: notifications, isLoading } = useQuery<{ notifications: Notification[]; pagination: { total: number } }>({
    queryKey: [portal, "notifications"],
    queryFn: () => fetchJson(`/api/notifications`),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "notifications"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () =>
      fetchJson(`/api/notifications/read-all`, { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "notifications"] });
    },
  });

  if (isLoading) {
    return <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>;
  }

  const list = notifications?.notifications ?? [];
  const unreadCount = list.filter((n) => !n.read).length;

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
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "22px",
                height: "22px",
                padding: "0 6px",
                borderRadius: "11px",
                backgroundColor: "var(--color-primary)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            style={{
              ...btnBase,
              backgroundColor: "transparent",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary)",
              opacity: markAllRead.isPending ? 0.5 : 1,
            }}
          >
            <CheckCheck size={16} /> Mark All Read
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          <Bell size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No notifications yet.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {list.map((n) => (
            <div
              key={n.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                padding: "14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                borderLeft: n.read ? "1px solid var(--color-border)" : "3px solid var(--color-primary)",
                backgroundColor: n.read ? "var(--color-bg)" : "var(--color-primary-light)",
                transition: "background-color 100ms ease",
                cursor: n.link ? "pointer" : "default",
              }}
              onClick={() => {
                if (n.link) window.location.href = n.link;
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: n.read ? "transparent" : "var(--color-primary)",
                  flexShrink: 0,
                  marginTop: "5px",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "14px",
                      color: "var(--color-text)",
                      fontWeight: n.read ? 500 : 700,
                    }}
                  >
                    {n.title}
                  </strong>
                  <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                    {relativeTime(n.createdAt)}
                  </span>
                </div>
                {n.body && (
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "13px",
                      color: "var(--color-text-secondary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {n.body}
                  </p>
                )}
                {!n.read && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      markRead.mutate(n.id);
                    }}
                    style={{
                      ...btnBase,
                      marginTop: "8px",
                      padding: "4px 10px",
                      fontSize: "12px",
                      backgroundColor: "transparent",
                      color: "var(--color-primary)",
                      border: "1px solid var(--color-border)",
                      minHeight: "28px",
                    }}
                  >
                    Mark as read
                  </button>
                )}
              </div>
              {n.link && (
                <ExternalLink size={14} color="var(--color-text-secondary)" style={{ flexShrink: 0, marginTop: "4px" }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
