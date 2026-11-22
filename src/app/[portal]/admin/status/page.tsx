import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { portalDbUrl } from "@/db/client";
import { ApiError } from "@/lib/api";
import { listPortals } from "@/lib/deployment";
import { requireTenant } from "@/lib/tenant";
import { appliedMigrations } from "@/tui/lib/tui-db";

export const dynamic = "force-dynamic";

const cardStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    backgroundColor: "var(--color-bg)",
    marginBottom: "20px",
};

const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
};

const tdStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--color-text)",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
};

interface PortalStatus {
    name: string;
    slug: string;
    configured: boolean;
    migrations: number | null;
}

async function loadData(request: NextRequest) {
    try {
        const ctx = await requireTenant(request, { permission: "manage_settings" });
        let queues: Array<{ state: string; n: number }> | null = null;
        try {
            const qRes = (await ctx.db.execute(
                sql`SELECT state, count(*) AS n FROM pgboss.job GROUP BY state`,
            )) as unknown as { rows?: Array<{ state?: string; n?: string | number }> };
            queues = (qRes.rows ?? []).map((r) => ({
                state: String(r.state ?? "unknown"),
                n: Number(r.n ?? 0),
            }));
        } catch {
            queues = null;
        }
        const portalStatuses: PortalStatus[] = await Promise.all(
            listPortals().map(async (p) => {
                const url = portalDbUrl(p.slug);
                const applied = url ? await appliedMigrations(url) : null;
                return {
                    name: p.name,
                    slug: p.slug,
                    configured: url !== undefined,
                    migrations: applied === null ? null : applied.length,
                };
            }),
        );
        return { ok: true as const, queues, portalStatuses };
    } catch (e) {
        if (e instanceof ApiError) return { ok: false as const, status: e.status };
        console.error(e);
        return { ok: false as const, status: 500 };
    }
}

export default async function StatusPage() {
    const t = await getTranslations("status");
    const te = await getTranslations("errors");
    const store = await cookies();
    const request = {
        cookies: {
            get: (name: string) => {
                const v = store.get(name)?.value;
                return v === undefined ? undefined : { value: v };
            },
        },
    };
    const result = await loadData(request as unknown as NextRequest);
    if (!result.ok) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-destructive)" }}>
                {result.status === 500 ? te("internal") : te("forbidden")}
            </p>
        );
    }
    const { queues, portalStatuses } = result;
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
            <section style={cardStyle}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        margin: "0 0 12px",
                        color: "var(--color-text)",
                    }}
                >
                    {t("portals")}
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th scope="col" style={thStyle}>
                                {t("name")}
                            </th>
                            <th scope="col" style={thStyle}>
                                {t("slug")}
                            </th>
                            <th scope="col" style={thStyle}>
                                {t("configured")}
                            </th>
                            <th scope="col" style={thStyle}>
                                {t("migrations")}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {portalStatuses.map((p) => (
                            <tr key={p.slug}>
                                <td style={tdStyle}>{p.name}</td>
                                <td style={tdStyle}>
                                    <code style={{ fontSize: "12px" }}>{p.slug}</code>
                                </td>
                                <td style={tdStyle}>
                                    {p.configured ? t("yes") : t("notConfigured")}
                                </td>
                                <td style={tdStyle}>
                                    {p.migrations === null ? t("unavailable") : p.migrations}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
            <section style={cardStyle}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        margin: "0 0 12px",
                        color: "var(--color-text)",
                    }}
                >
                    {t("queues")}
                </h2>
                {queues === null ? (
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            margin: 0,
                        }}
                    >
                        {t("unavailable")}
                    </p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th scope="col" style={thStyle}>
                                    {t("state")}
                                </th>
                                <th scope="col" style={thStyle}>
                                    {t("count")}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {queues.map((q) => (
                                <tr key={q.state}>
                                    <td style={tdStyle}>{q.state}</td>
                                    <td style={tdStyle}>{q.n}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                {t("storageNote")}
            </p>
        </div>
    );
}
