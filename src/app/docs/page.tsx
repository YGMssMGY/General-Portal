import type { CSSProperties } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const description = "Documentation, API references, and operator guides for General Portal.";

export const metadata = {
    title: "Docs",
    description,
    openGraph: { title: "Docs", description, type: "website", url: "/docs" },
    twitter: { card: "summary_large_image", title: "Docs", description },
    alternates: { canonical: "/docs" },
};

const page: CSSProperties = { maxWidth: "760px", margin: "0 auto", padding: "40px 24px 80px" };
const h2: CSSProperties = { fontSize: "18px", margin: "32px 0 12px" };
const list: CSSProperties = { listStyle: "none", padding: 0, margin: 0 };
const link: CSSProperties = {
    display: "block",
    padding: "10px 0",
    fontSize: "14px",
    borderBottom: "1px solid var(--color-border)",
};

const repo = "https://github.com/YGMssMGY/General-Portal/blob/main/";
const guides = [
    { key: "readme", file: "README.md" },
    { key: "architecture", file: "docs/architecture.md" },
    { key: "deployment", file: "docs/deployment.md" },
    { key: "auth", file: "docs/auth.md" },
    { key: "security", file: "docs/security.md" },
    { key: "i18n", file: "docs/i18n.md" },
    { key: "tui", file: "docs/tui.md" },
    { key: "api", file: "docs/api.md" },
    { key: "runbook", file: "docs/runbook.md" },
] as const;

export default async function DocsPage() {
    const t = await getTranslations("marketing");
    return (
        <main style={page}>
            <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>{t("docs.title")}</h1>
            <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", margin: 0 }}>
                {t("docs.subtitle")}
            </p>
            <h2 style={h2}>{t("docs.guidesTitle")}</h2>
            <ul style={list}>
                {guides.map((guide) => (
                    <li key={guide.key} style={link}>
                        <a href={`${repo}${guide.file}`} target="_blank" rel="noreferrer">
                            {t(`docs.guides.${guide.key}`)}
                        </a>
                    </li>
                ))}
            </ul>
            <h2 style={h2}>{t("docs.apiTitle")}</h2>
            <ul style={list}>
                <li style={link}>
                    <Link href="/api/public/openapi.json">{t("docs.publicApi")}</Link>
                </li>
                <li style={link}>
                    <Link href="/api/ops/openapi.json">{t("docs.operatorApi")}</Link>
                </li>
            </ul>
        </main>
    );
}
