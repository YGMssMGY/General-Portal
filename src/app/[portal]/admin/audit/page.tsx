import type { NextRequest } from "next/server";
import Link from "next/link";
import { cookies } from "next/headers";
import { and, desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auditLogs } from "@/db/schema";
import { ApiError, decodeCursorValues, encodeCursorValues, keysetWhere } from "@/lib/api";
import { verifyAuditChain } from "@/lib/audit";
import { requireTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const cardStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    backgroundColor: "var(--color-bg)",
    marginBottom: "20px",
};

const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    fontSize: "13px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text)",
    fontFamily: "inherit",
    outline: "none",
};

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
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
    whiteSpace: "nowrap",
};

async function loadData(
    entityType: string | null,
    action: string | null,
    cursor: string | null,
    request: NextRequest,
) {
    try {
        const ctx = await requireTenant(request, {
            permission: "view_audit",
        });
        const limit = 50;
        const conds = [eq(auditLogs.workspaceId, ctx.workspaceId)];
        if (entityType) conds.push(eq(auditLogs.entityType, entityType));
        if (action) conds.push(eq(auditLogs.action, action));
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: auditLogs.createdAt, value: at }],
                        auditLogs.id,
                        vals[1],
                    ),
                );
            }
        }
        const rows = await ctx.db.query.auditLogs.findMany({
            where: and(...conds),
            orderBy: [desc(auditLogs.createdAt), desc(auditLogs.id)],
            limit: limit + 1,
            with: { user: { columns: { id: true, name: true, email: true } } },
        });
        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const integrity = await verifyAuditChain(ctx.db, ctx.workspaceId);
        const exportHref =
            `/api/audit/export?` +
            new URLSearchParams({
                ...(entityType ? { entityType } : {}),
                ...(action ? { action } : {}),
            }).toString();
        const nextHref =
            `?` +
            new URLSearchParams({
                ...(entityType ? { entityType } : {}),
                ...(action ? { action } : {}),
                ...(nextCursor ? { cursor: nextCursor } : {}),
            }).toString();
        return { ok: true as const, rows, integrity, exportHref, nextHref, nextCursor };
    } catch (e) {
        if (e instanceof ApiError) {
            return { ok: false as const, status: e.status };
        }
        console.error(e);
        return { ok: false as const, status: 500 };
    }
}

export default async function AuditPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const t = await getTranslations("auditPage");
    const te = await getTranslations("errors");
    const params = await searchParams;
    const entityType =
        typeof params.entityType === "string" && params.entityType.trim() !== ""
            ? params.entityType.trim()
            : null;
    const action =
        typeof params.action === "string" && params.action.trim() !== ""
            ? params.action.trim()
            : null;
    const cursor = typeof params.cursor === "string" ? params.cursor : null;
    const store = await cookies();
    const request = {
        cookies: {
            get: (name: string) => {
                const v = store.get(name)?.value;
                return v === undefined ? undefined : { value: v };
            },
        },
    };
    const result = await loadData(entityType, action, cursor, request as unknown as NextRequest);
    if (!result.ok) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-destructive)" }}>
                {result.status === 500 ? te("internal") : te("forbidden")}
            </p>
        );
    }
    const { rows, integrity, exportHref, nextHref, nextCursor } = result;
    return (
        <div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                }}
            >
                <h1
                    style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        margin: 0,
                        color: "var(--color-text)",
                    }}
                >
                    {t("title")}
                </h1>
                <a
                    href={exportHref}
                    download
                    style={{
                        padding: "8px 16px",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                        fontSize: "13px",
                        fontWeight: 600,
                        textDecoration: "none",
                        backgroundColor: "var(--color-bg)",
                        color: "var(--color-text)",
                    }}
                >
                    {t("export")}
                </a>
            </div>
            <form method="get" style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
                <input
                    name="entityType"
                    defaultValue={entityType ?? ""}
                    placeholder={t("entityType")}
                    style={inputStyle}
                />
                <input
                    name="action"
                    defaultValue={action ?? ""}
                    placeholder={t("action")}
                    style={inputStyle}
                />
                <button
                    type="submit"
                    style={{
                        padding: "8px 16px",
                        borderRadius: "var(--radius-sm)",
                        border: "none",
                        fontSize: "13px",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        backgroundColor: "var(--color-primary)",
                        color: "#fff",
                    }}
                >
                    {t("filter")}
                </button>
            </form>
            <div style={cardStyle}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        margin: "0 0 8px",
                        color: "var(--color-text)",
                    }}
                >
                    {t("integrity")}
                </h2>
                <p
                    style={{
                        fontSize: "13px",
                        margin: 0,
                        color: integrity.ok ? "var(--color-success)" : "var(--color-destructive)",
                    }}
                >
                    {integrity.ok
                        ? t("integrityOk", { count: integrity.checked })
                        : t("integrityFailed")}
                </p>
            </div>
            {rows.length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noLogs")}
                </p>
            ) : (
                <div style={{ ...cardStyle, padding: 0, overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>{t("timestamp")}</th>
                                <th style={thStyle}>{t("user")}</th>
                                <th style={thStyle}>{t("action")}</th>
                                <th style={thStyle}>{t("entityType")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td style={tdStyle}>{r.createdAt.toLocaleString()}</td>
                                    <td style={tdStyle}>{r.user?.email ?? ""}</td>
                                    <td style={tdStyle}>{r.action}</td>
                                    <td style={tdStyle}>{r.entityType}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {nextCursor && (
                <Link
                    href={nextHref}
                    style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--color-primary)",
                    }}
                >
                    {t("loadMore")}
                </Link>
            )}
        </div>
    );
}
