"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePortal } from "@/hooks/usePortal";
import { fetchJson } from "@/lib/api-client";

interface RoleRow {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    permissions: string[];
}

interface PermissionsData {
    defaults: Record<string, string[]>;
    roles: RoleRow[];
    permissions: string[];
}

const SYSTEM_ROLE_NAMES = new Set(["admin", "officer", "member"]);

const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
    whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--color-text)",
    padding: "6px 12px",
    borderBottom: "1px solid var(--color-border)",
    textAlign: "center",
};

export default function PermissionsPage() {
    const t = useTranslations("permissions");
    const tc = useTranslations("common");
    const te = useTranslations("errors");
    const portal = usePortal();
    const { user } = useAuthSession();
    const queryClient = useQueryClient();
    usePageTitle(t("title"));

    const canView = user?.permissions.includes("view_audit") ?? false;
    const canManage = user?.permissions.includes("manage_roles") ?? false;
    const allowed = canView || canManage;

    const { data, isLoading, isError } = useQuery<PermissionsData>({
        queryKey: [portal, "admin", "permissions"],
        queryFn: () => fetchJson<PermissionsData>("/api/admin/permissions"),
        enabled: allowed && portal !== "",
    });

    const mutation = useMutation({
        mutationFn: (vars: { roleId: string; permissions: string[] }) =>
            fetchJson("/api/admin/permissions", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(vars),
            }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [portal, "admin", "permissions"] });
            toast.success(t("updateSuccess"));
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : te("internal")),
    });

    if (!allowed) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-destructive)" }}>{te("forbidden")}</p>
        );
    }
    if (isLoading) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                {tc("loading")}
            </p>
        );
    }
    if (isError || !data) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-destructive)" }}>{te("internal")}</p>
        );
    }

    const roles = data.roles;
    const permissions = data.permissions;

    const toggle = (role: RoleRow, permission: string) => {
        if (!canManage || role.isSystem || SYSTEM_ROLE_NAMES.has(role.name)) return;
        const next = role.permissions.includes(permission)
            ? role.permissions.filter((p) => p !== permission)
            : [...role.permissions, permission];
        mutation.mutate({ roleId: role.id, permissions: next });
    };

    return (
        <div>
            <h1
                style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: "0 0 20px",
                    color: "var(--color-text)",
                }}
            >
                {t("title")}
            </h1>
            <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th style={thStyle}>{t("permission")}</th>
                            {roles.map((role) => (
                                <th key={role.id} style={thStyle}>
                                    {role.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {permissions.map((permission) => (
                            <tr key={permission}>
                                <td style={{ ...tdStyle, textAlign: "left", whiteSpace: "nowrap" }}>
                                    {permission}
                                </td>
                                {roles.map((role) => {
                                    const checked = role.permissions.includes(permission);
                                    const locked =
                                        !canManage ||
                                        role.isSystem ||
                                        SYSTEM_ROLE_NAMES.has(role.name);
                                    return (
                                        <td key={role.id} style={tdStyle}>
                                            <button
                                                type="button"
                                                disabled={locked || mutation.isPending}
                                                aria-pressed={checked}
                                                onClick={() => toggle(role, permission)}
                                                style={{
                                                    border: "none",
                                                    background: "transparent",
                                                    color: checked
                                                        ? "var(--color-success)"
                                                        : "var(--color-text-secondary)",
                                                    cursor: locked ? "default" : "pointer",
                                                    fontFamily: "inherit",
                                                    fontSize: "13px",
                                                    minWidth: "32px",
                                                }}
                                            >
                                                {checked ? tc("yes") : "—"}
                                            </button>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
