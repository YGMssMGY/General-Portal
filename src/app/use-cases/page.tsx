import type { CSSProperties } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

const description = "See how clubs, firms, and agencies run their operations in General Portal.";

export const metadata = {
    title: "Use cases",
    description,
    openGraph: {
        title: "Use cases",
        description,
        type: "website",
        url: "/use-cases",
    },
    twitter: { card: "summary_large_image", title: "Use cases", description },
    alternates: { canonical: "/use-cases" },
};

const page: CSSProperties = {
    maxWidth: "880px",
    margin: "0 auto",
    padding: "40px 24px 80px",
    color: "var(--color-text)",
};
const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginTop: "32px",
};
const card: CSSProperties = {
    display: "block",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    padding: "24px",
    backgroundColor: "var(--color-bg-secondary)",
    textDecoration: "none",
};
const h2: CSSProperties = { fontSize: "18px", margin: "0 0 8px", color: "var(--color-text)" };
const p: CSSProperties = {
    fontSize: "14px",
    color: "var(--color-text-secondary)",
    margin: 0,
};

const audiences = ["clubs", "firms", "agencies"] as const;

export default async function UseCasesPage() {
    const t = await getTranslations("marketing");
    return (
        <main style={page}>
            <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>{t("useCases.title")}</h1>
            <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", margin: 0 }}>
                {t("useCases.subtitle")}
            </p>
            <nav aria-label={t("useCases.title")} style={grid}>
                {audiences.map((audience) => (
                    <Link key={audience} href={`/use-cases/${audience}`} style={card}>
                        <h2 style={h2}>{t(`useCases.${audience}.title`)}</h2>
                        <p style={p}>{t(`useCases.${audience}.description`)}</p>
                    </Link>
                ))}
            </nav>
        </main>
    );
}
