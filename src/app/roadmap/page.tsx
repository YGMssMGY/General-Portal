import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";

const description = "What we are building in General Portal and what has already shipped.";

export const metadata = {
    title: "Roadmap",
    description,
    openGraph: { title: "Roadmap", description, type: "website", url: "/roadmap" },
    twitter: { card: "summary_large_image", title: "Roadmap", description },
    alternates: { canonical: "/roadmap" },
};

const page: CSSProperties = { maxWidth: "1000px", margin: "0 auto", padding: "40px 24px 80px" };
const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
    marginTop: "24px",
};
const columnStyle: CSSProperties = {
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

const columns = [
    { key: "now", items: ["presets", "demo"] },
    { key: "next", items: ["sdk", "analytics"] },
    { key: "later", items: ["backups", "scim"] },
    { key: "done", items: ["presence", "badges"] },
] as const;

export default async function RoadmapPage() {
    const t = await getTranslations("marketing");
    return (
        <main style={page}>
            <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>{t("roadmap.title")}</h1>
            <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", margin: 0 }}>
                {t("roadmap.subtitle")}
            </p>
            <section style={grid} aria-label={t("roadmap.title")}>
                {columns.map((column) => (
                    <div key={column.key} style={columnStyle}>
                        <h2 style={h2}>{t(`roadmap.columns.${column.key}`)}</h2>
                        <ul style={list}>
                            {column.items.map((item) => (
                                <li key={item} style={entry}>
                                    {t(`roadmap.items.${item}`)}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
        </main>
    );
}
