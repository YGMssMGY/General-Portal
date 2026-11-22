import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/JsonLd";
import { siteUrl } from "@/lib/seo";

const BASE = siteUrl();
const PATH = "/features";
const TITLE = "Features | General Portal";
const DESCRIPTION =
    "Explore the modules that make General Portal the self-hosted workspace OS for teams and organizations.";

export const metadata: Metadata = {
    metadataBase: new URL(BASE),
    title: "Features",
    description: DESCRIPTION,
    openGraph: {
        title: TITLE,
        description: DESCRIPTION,
        type: "website",
        url: `${BASE}${PATH}`,
        images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "General Portal" }],
    },
    twitter: {
        card: "summary_large_image",
        title: TITLE,
        description: DESCRIPTION,
        images: ["/twitter-image"],
    },
    alternates: {
        canonical: PATH,
        languages: Object.fromEntries(
            ["en-US", "zh-CN", "de-DE", "fr-FR", "es-ES"].map((locale) => [
                locale,
                `${BASE}${PATH}`,
            ]),
        ),
    },
};

const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
        {
            "@type": "WebSite",
            url: BASE,
            name: "General Portal",
            description: DESCRIPTION,
        },
        {
            "@type": "SoftwareApplication",
            name: "General Portal",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: DESCRIPTION,
        },
    ],
};

export default async function FeaturesPage() {
    const t = await getTranslations("marketing");
    return (
        <main
            style={{
                maxWidth: "720px",
                margin: "0 auto",
                padding: "48px 24px",
                color: "var(--color-text)",
            }}
        >
            <JsonLd data={structuredData} />
            <section style={{ marginBottom: "48px" }}>
                <h1 style={{ fontSize: "32px", margin: 0 }}>{t("features.title")}</h1>
                <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                    {t("features.subtitle")}
                </p>
            </section>
            <section>
                <h2 style={{ fontSize: "22px", marginTop: 0 }}>{t("features.modulesTitle")}</h2>
                <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                    {t("features.modulesBody")}
                </p>
            </section>
        </main>
    );
}
