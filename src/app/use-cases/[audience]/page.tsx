import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

const audiences = ["clubs", "firms", "agencies"] as const;
type Audience = (typeof audiences)[number];
const benefitCounts: Record<Audience, number> = { clubs: 4, firms: 4, agencies: 4 };

function isAudience(value: string): value is Audience {
    return (audiences as readonly string[]).includes(value);
}

export function generateStaticParams() {
    return audiences.map((audience) => ({ audience }));
}

export async function generateMetadata({ params }: { params: Promise<{ audience: string }> }) {
    const { audience } = await params;
    const title = `${audience} use cases`;
    const description = `How ${audience} run their operations in General Portal.`;
    return {
        title,
        description,
        openGraph: { title, description, type: "website", url: `/use-cases/${audience}` },
        twitter: { card: "summary_large_image", title, description },
        alternates: { canonical: `/use-cases/${audience}` },
    };
}

const page: CSSProperties = {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "40px 24px 80px",
    color: "var(--color-text)",
};
const back: CSSProperties = { fontSize: "14px", marginBottom: "24px" };
const h2: CSSProperties = { fontSize: "18px", margin: "32px 0 12px" };
const list: CSSProperties = { fontSize: "14px", lineHeight: 1.8, paddingLeft: "20px" };
const links: CSSProperties = { display: "flex", gap: "20px", marginTop: "32px", fontSize: "14px" };

export default async function AudienceUseCasePage({
    params,
}: {
    params: Promise<{ audience: string }>;
}) {
    const { audience } = await params;
    if (!isAudience(audience)) notFound();
    const t = await getTranslations("marketing");
    const tc = await getTranslations("common");
    const benefits = Array.from({ length: benefitCounts[audience] }, (_, i) =>
        t(`useCase.${audience}.benefits.${i + 1}`),
    );
    return (
        <main style={page}>
            <nav aria-label={tc("back")} style={back}>
                <Link href="/use-cases">{tc("back")}</Link>
            </nav>
            <h1 style={{ fontSize: "28px", margin: "0 0 8px" }}>
                {t(`useCase.${audience}.title`)}
            </h1>
            <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", margin: 0 }}>
                {t(`useCase.${audience}.intro`)}
            </p>
            <h2 style={h2}>{t("useCase.benefitsTitle")}</h2>
            <ul style={list}>
                {benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                ))}
            </ul>
            <nav style={links} aria-label={t("links.label")}>
                <Link href="/features">{t("links.features")}</Link>
                <Link href="/demo">{t("links.demo")}</Link>
            </nav>
        </main>
    );
}
