import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { and, count, gt, isNull, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { authPending, sessions, users } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function formatBytes(n: number): string {
    if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
    if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(2)} MB`;
    if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${n} B`;
}

const cardStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    backgroundColor: "var(--color-bg)",
    marginBottom: "20px",
};

const tdStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--color-text)",
    padding: "8px 12px",
    borderBottom: "1px solid var(--color-border)",
};

async function loadData(request: NextRequest) {
    try {
        const ctx = await requireTenant(request, {
            permission: "manage_settings",
        });
        const db = ctx.db;
        const sizeRes = (await db.execute(
            sql`SELECT pg_database_size(current_database()) AS size`,
        )) as unknown as { rows?: Array<{ size?: string | number }> };
        const dbSize = Number(sizeRes.rows?.[0]?.size ?? 0);
        const [userRows, sessionRows, pendingRows] = await Promise.all([
            db.select({ n: count() }).from(users),
            db
                .select({ n: count() })
                .from(sessions)
                .where(and(isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date()))),
            db
                .select({ n: count() })
                .from(authPending)
                .where(gt(authPending.expiresAt, new Date())),
        ]);
        let migrations: number | null = null;
        try {
            const mRes = (await db.execute(
                sql`SELECT count(*) AS n FROM "__drizzle_migrations"`,
            )) as unknown as { rows?: Array<{ n?: string | number }> };
            migrations = Number(mRes.rows?.[0]?.n ?? 0);
        } catch {
            migrations = null;
        }
        let queues: Array<{ state: string; n: number }> | null = null;
        try {
            const qRes = (await db.execute(
                sql`SELECT state, count(*) AS n FROM pgboss.job GROUP BY state`,
            )) as unknown as { rows?: Array<{ state?: string; n?: string | number }> };
            queues = (qRes.rows ?? []).map((r) => ({
                state: String(r.state ?? "unknown"),
                n: Number(r.n ?? 0),
            }));
        } catch {
            queues = null;
        }
        return {
            ok: true as const,
            dbSize,
            userRows,
            sessionRows,
            pendingRows,
            migrations,
            queues,
        };
    } catch (e) {
        if (e instanceof ApiError) {
            return { ok: false as const, status: e.status };
        }
        console.error(e);
        return { ok: false as const, status: 500 };
    }
}

export default async function HealthPage() {
    const t = await getTranslations("health");
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
    const { dbSize, userRows, sessionRows, pendingRows, migrations, queues } = result;
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
            <div style={cardStyle}>
                <h2
                    style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        margin: "0 0 12px",
                        color: "var(--color-text)",
                    }}
                >
                    {t("database")}
                </h2>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                        <tr>
                            <td style={tdStyle}>{t("dbSize")}</td>
                            <td style={tdStyle}>{formatBytes(dbSize)}</td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>{t("users")}</td>
                            <td style={tdStyle}>{userRows[0]?.n ?? 0}</td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>{t("activeSessions")}</td>
                            <td style={tdStyle}>{sessionRows[0]?.n ?? 0}</td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>{t("authPending")}</td>
                            <td style={tdStyle}>{pendingRows[0]?.n ?? 0}</td>
                        </tr>
                        <tr>
                            <td style={tdStyle}>{t("migrations")}</td>
                            <td style={tdStyle}>
                                {migrations === null ? t("unavailable") : migrations}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={cardStyle}>
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
            </div>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                {t("poolNote")}
            </p>
        </div>
    );
}
