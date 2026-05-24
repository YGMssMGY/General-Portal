"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Save, Settings as SettingsIcon, Shield } from "lucide-react";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Workspace {
  id: string;
  name: string;
  settings: Record<string, boolean>;
}

const MODULES = [
  { key: "proposals", label: "Proposals" },
  { key: "tasks", label: "Tasks" },
  { key: "events", label: "Events" },
  { key: "messages", label: "Messages" },
  { key: "finance", label: "Finance" },
  { key: "volunteers", label: "Volunteers" },
  { key: "members", label: "Members" },
  { key: "files", label: "Files" },
  { key: "meetings", label: "Meetings" },
  { key: "activity", label: "Activity Feed" },
  { key: "search", label: "Search" },
  { key: "accounts", label: "Accounts & Kudos" },
  { key: "notifications", label: "Notifications" },
  { key: "budget", label: "Budget" },
];

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

export default function SettingsPage() {
  const portal = usePortal();
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`Settings | ${portalName}`);
  const qc = useQueryClient();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const { data: workspace, isLoading } = useQuery<Workspace>({
    queryKey: [portal, "settings"],
    queryFn: () => fetchJson(`/api/settings`),
  });

  const { data: profile } = useQuery<{ role: string }>({
    queryKey: [portal, "me"],
    queryFn: () => fetchJson(`/api/me`),
  });

  useEffect(() => {
    if (workspace && !loaded) {
      setToggles(workspace.settings || {});
      setLoaded(true);
    }
  }, [workspace, loaded]);

  const updateMutation = useMutation({
    mutationFn: (settings: Record<string, boolean>) =>
      fetchJson(`/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "settings"] });
    },
  });

  const isAdmin = profile?.role === "admin";

  if (isLoading) {
    return <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 20px", color: "var(--color-text)" }}>
        Workspace Settings
      </h1>

      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          padding: "16px",
          marginBottom: "20px",
          backgroundColor: "var(--color-bg)",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-text)" }}>
          Workspace
        </h3>
        <p style={{ fontSize: "14px", color: "var(--color-text)", margin: 0 }}>
          {workspace?.name ?? "Untitled"}
        </p>
      </div>

      {!isAdmin ? (
        <div
          style={{
            padding: "16px",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            backgroundColor: "var(--color-bg-secondary)",
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Shield size={18} />
          Only administrators can edit workspace settings.
        </div>
      ) : (
        <>
          <div
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "16px",
              marginBottom: "16px",
              backgroundColor: "var(--color-bg)",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                margin: "0 0 12px",
                color: "var(--color-text)",
              }}
            >
              Module Toggles
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {MODULES.map((mod) => (
                <label
                  key={mod.key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 0",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "var(--color-text)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "40px",
                      height: "24px",
                      borderRadius: "12px",
                      backgroundColor: toggles[mod.key] !== false ? "var(--color-primary)" : "var(--color-border)",
                      transition: "background-color 150ms ease",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "3px",
                        left: toggles[mod.key] !== false ? "19px" : "3px",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        backgroundColor: "#fff",
                        transition: "left 150ms ease",
                      }}
                    />
                    <input
                      type="checkbox"
                      checked={toggles[mod.key] !== false}
                      onChange={() =>
                        setToggles((prev) => ({
                          ...prev,
                          [mod.key]: prev[mod.key] === false ? true : false,
                        }))
                      }
                      style={{ opacity: 0, position: "absolute", width: "100%", height: "100%", cursor: "pointer", margin: 0 }}
                    />
                  </div>
                  <span>{mod.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => updateMutation.mutate(toggles)}
            disabled={updateMutation.isPending}
            style={{
              ...btnBase,
              backgroundColor: "var(--color-primary)",
              color: "#fff",
              opacity: updateMutation.isPending ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!updateMutation.isPending) e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-primary)";
            }}
          >
            <Save size={16} /> {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </button>
        </>
      )}
    </div>
  );
}
