"use client";

import { Shield } from "lucide-react";

const roleConfig: Record<string, { color: string; bg: string }> = {
  admin: { color: "var(--color-primary)", bg: "var(--color-primary-light)" },
  officer: { color: "var(--color-success)", bg: "#e8f5e9" },
  member: { color: "var(--color-text-secondary)", bg: "var(--color-bg-secondary)" },
};

export function RoleBadge({ role }: { role: string }) {
  const cfg = roleConfig[role] ?? roleConfig.member;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        fontSize: "12px",
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        textTransform: "capitalize",
      }}
    >
      <Shield size={12} />
      {role}
    </span>
  );
}
