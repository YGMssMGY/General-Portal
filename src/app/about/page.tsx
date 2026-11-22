import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";

const description = "The story, license, and self-hosting principles behind General Portal.";

export const metadata = {
    title: "About",
    description,
    openGraph: { title: "About", description, type: "website", url: "/about" },
    twitter: { card: "summary_large_image", title: "About", description },
    alternates: { canonical: "/about" },
};

const page: CSSProperties = { maxWidth: "760px", margin: "0 auto", padding: "40px 24px 80px" };
const tagline: CSSProperties = {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--color-primary)",
    margin: "0 0 8px",
};
const h1: CSSProperties = { fontSize: "28px", margin: "0 0 24px" };
const body: CSSProperties = { fontSize: "15px", lineHeight: 1.7, margin: "0 0 12px" };
const h2: CSSProperties = { fontSize: "18px", margin: "32px 0 12px" };
const list: CSSProperties = { fontSize: "14px", lineHeight: 1.8, paddingLeft: "20px" };

const facts = ["license", "selfHosted", "fonts"] as const;

export default async function AboutPage() {
    const t = await getTranslations("marketing");
    return (
        <main style={page}>
            <p style={tagline}>{t("about.tagline")}</p>
            <h1 style={h1}>{t("about.title")}</h1>
            <p style={body}>{t("about.story1")}</p>
            <p style={body}>{t("about.story2")}</p>
            <section>
                <h2 style={h2}>{t("about.factsTitle")}</h2>
                <ul style={list}>
                    {facts.map((fact) => (
                        <li key={fact}>{t(`about.facts.${fact}`)}</li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
