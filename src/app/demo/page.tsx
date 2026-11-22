import type { CSSProperties } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const description = "A read-only preview of General Portal workspaces.";

export const metadata = {
    title: "Demo",
    description,
    openGraph: { title: "Demo", description, type: "website", url: "/demo" },
    twitter: { card: "summary_large_image", title: "Demo", description },
    alternates: { canonical: "/demo" },
};

const page: CSSProperties = { maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" };
const banner: CSSProperties = {
    border: "1px solid var(--color-primary)",
    borderRadius: "8px",
    padding: "12px 16px",
    fontSize: "14px",
    color: "var(--color-primary)",
    backgroundColor: "var(--color-primary-light)",
    marginBottom: "24px",
};
const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginTop: "24px",
};
const cardStyle: CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    padding: "20px",
    backgroundColor: "var(--color-bg-secondary)",
};
const h2: CSSProperties = { fontSize: "16px", margin: "0 0 12px" };
const list: CSSProperties = { listStyle: "none", padding: 0, margin: 0 };
const entry: CSSProperties = {
    fontSize: "14px",
    padding: "8px 0",
    borderTop: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
};
const note: CSSProperties = { fontSize: "14px", marginTop: "32px" };
const links: CSSProperties = { display: "flex", gap: "20px", marginTop: "12px", fontSize: "14px" };

const cards = ["tasks", "proposals", "members"] as const;
const rowCounts: Record<(typeof cards)[number], number> = {
    tasks: 3,
    proposals: 2,
    members: 3,
};

export default async function DemoPage() {
    const t = await getTranslations("marketing");
    const tc = await getTranslations("common");
    return (
        <main style={page}>
            <div role="status" style={banner}>
                {t("demo.banner")}
            </div>
            <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>{t("demo.title")}</h1>
            <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", margin: 0 }}>
                {t("demo.subtitle")}
            </p>
            <section style={grid} aria-label={t("demo.title")}>
                {cards.map((card) => (
                    <div key={card} style={cardStyle}>
                        <h2 style={h2}>{t(`demo.cards.${card}.title`)}</h2>
                        <ul style={list}>
                            {Array.from({ length: rowCounts[card] }, (_, i) => (
                                <li key={i} style={entry}>
                                    {t(`demo.cards.${card}.rows.${i + 1}`)}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
            <p style={note}>{t("demo.gated")}</p>
            <nav style={links} aria-label={t("links.label")}>
                <Link href="/login">{tc("signIn")}</Link>
                <Link href="/features">{t("links.features")}</Link>
            </nav>
        </main>
    );
}
