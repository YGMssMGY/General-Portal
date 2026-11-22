import type { NextRequest } from "next/server";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ApiError } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

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
    verticalAlign: "top",
};

function flattenKeys(value: unknown, prefix = "", out: string[] = []): string[] {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        if (prefix) out.push(prefix);
        return out;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        flattenKeys(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
}

function readKeys(dir: string, locale: string): Set<string> {
    const raw = readFileSync(path.join(dir, `${locale}.json`), "utf8");
    return new Set(flattenKeys(JSON.parse(raw) as unknown).sort());
}

async function loadData(request: NextRequest) {
    try {
        await requireTenant(request, { permission: "manage_settings" });
        const dir = path.join(process.cwd(), "messages");
        const available = new Set(
            readdirSync(dir)
                .filter((file) => file.endsWith(".json"))
                .map((file) => file.slice(0, -5)),
        );
        if (!available.has("en-US")) return { ok: false as const, status: 503 };
        const referenceKeys = [...readKeys(dir, "en-US")];
        const rows = routing.locales
            .filter((locale) => locale !== "en-US")
            .map((locale) => {
                const keys = available.has(locale) ? readKeys(dir, locale) : new Set<string>();
                return {
                    locale,
                    missing: referenceKeys.filter((key) => !keys.has(key)),
                };
            });
        return { ok: true as const, rows };
    } catch (e) {
        if (e instanceof ApiError) return { ok: false as const, status: e.status };
        console.error("GET /admin/translations", e);
        return { ok: false as const, status: 500 };
    }
}

export default async function TranslationsPage() {
    const t = await getTranslations("translations");
    const te = await getTranslations("errors");
    const store = await cookies();
    const request = {
        cookies: {
            get: (name: string) => {
                const value = store.get(name)?.value;
                return value === undefined ? undefined : { value };
            },
        },
    };
    const result = await loadData(request as unknown as NextRequest);
    if (!result.ok) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-destructive)" }}>
                {result.status === 403 ? te("forbidden") : te("internal")}
            </p>
        );
    }
    const allComplete = result.rows.every((row) => row.missing.length === 0);
    return (
        <div>
            <h1
                style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: "0 0 8px",
                    color: "var(--color-text)",
                }}
            >
                {t("title")}
            </h1>
            <p
                style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    margin: "0 0 20px",
                }}
            >
                {t("description")}
            </p>
            {allComplete ? (
                <div style={cardStyle}>
                    <p style={{ fontSize: "14px", color: "var(--color-text)", margin: 0 }}>
                        {t("allComplete")}
                    </p>
                </div>
            ) : (
                <div style={cardStyle}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>{t("locale")}</th>
                                <th style={thStyle}>{t("missing")}</th>
                                <th style={thStyle}>{t("keys")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {result.rows
                                .filter((row) => row.missing.length > 0)
                                .map((row) => (
                                    <tr key={row.locale}>
                                        <td style={tdStyle}>{row.locale}</td>
                                        <td style={tdStyle}>{row.missing.length}</td>
                                        <td style={tdStyle}>
                                            {row.missing.slice(0, 20).join(", ")}
                                            {row.missing.length > 20
                                                ? ` ${t("showingFirst", { count: 20 })}`
                                                : ""}
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                <Link
                    href="https://github.com/YGMssMGY/General-Portal/blob/main/CONTRIBUTING.md"
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--color-primary)" }}
                >
                    {t("contributing")}
                </Link>
            </p>
        </div>
    );
}
