import type { CSSProperties } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const description = "How General Portal protects data, accounts, and the supply chain.";

export const metadata = {
    title: "Security",
    description,
    openGraph: { title: "Security", description, type: "website", url: "/security" },
    twitter: { card: "summary_large_image", title: "Security", description },
    alternates: { canonical: "/security" },
};

const page: CSSProperties = { maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" };
const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
    marginTop: "24px",
};
const card: CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    padding: "20px",
    backgroundColor: "var(--color-bg-secondary)",
};
const h2: CSSProperties = { fontSize: "16px", margin: "0 0 8px" };
const p: CSSProperties = { fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 };
const note: CSSProperties = { fontSize: "14px", marginTop: "32px" };
const links: CSSProperties = { marginTop: "12px", fontSize: "14px" };

const topics = [
    "transport",
    "authn",
    "authz",
    "uploads",
    "ssrf",
    "rateLimits",
    "audit",
    "supplyChain",
] as const;

export default async function SecurityPage() {
    const t = await getTranslations("marketing");
    return (
        <main style={page}>
            <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>{t("security.title")}</h1>
            <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", margin: 0 }}>
                {t("security.subtitle")}
            </p>
            <section style={grid} aria-label={t("security.title")}>
                {topics.map((topic) => (
                    <div key={topic} style={card}>
                        <h2 style={h2}>{t(`security.topics.${topic}.title`)}</h2>
                        <p style={p}>{t(`security.topics.${topic}.body`)}</p>
                    </div>
                ))}
            </section>
            <p style={note}>{t("security.reporting")}</p>
            <nav style={links} aria-label={t("links.label")}>
                <Link href="/docs">{t("security.docsLink")}</Link>
            </nav>
        </main>
    );
}
