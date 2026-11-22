import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/db/client";
import { workspaces } from "@/db/schema";
import { listPortals } from "@/lib/deployment";
import { PortalGrid, type PublicPortal } from "./PortalGrid";

export const revalidate = 300;

const SITE_DESCRIPTION =
    "A unified workspace platform for clubs, councils, and communities to collaborate, organize events, and manage their operations.";

export const metadata = {
    title: "General Portal",
    description: SITE_DESCRIPTION,
    openGraph: {
        title: "General Portal",
        description: SITE_DESCRIPTION,
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "General Portal",
        description: SITE_DESCRIPTION,
    },
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
};

export default async function HomePage() {
    const t = await getTranslations("landing");
    const rows = await Promise.all(
        listPortals().map(async ({ slug }) => {
            try {
                return await getDb(slug).query.workspaces.findFirst({
                    where: eq(workspaces.slug, slug),
                    columns: { slug: true, name: true, description: true, logoUrl: true },
                });
            } catch {
                return null;
            }
        }),
    );
    const portals: PublicPortal[] | null = rows.filter(
        (row): row is NonNullable<typeof row> => row !== null,
    );

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100dvh",
                padding: "24px",
                backgroundColor: "var(--color-bg-secondary)",
            }}
        >
            <div style={{ maxWidth: "720px", width: "100%" }}>
                <div style={{ marginBottom: "48px", textAlign: "center" }}>
                    <h1
                        style={{
                            fontSize: "28px",
                            fontWeight: 700,
                            color: "var(--color-text)",
                            margin: 0,
                            lineHeight: 1.3,
                        }}
                    >
                        {t("title")}
                    </h1>
                    <p
                        style={{
                            fontSize: "15px",
                            color: "var(--color-text-secondary)",
                            marginTop: "8px",
                            marginBottom: 0,
                        }}
                    >
                        {t("subtitle")}
                    </p>
                </div>

                {portals === null ? (
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-destructive)",
                            textAlign: "center",
                            margin: "32px 0",
                        }}
                    >
                        {t("loadFailed")}
                    </p>
                ) : (
                    <PortalGrid portals={portals} />
                )}
            </div>
        </div>
    );
}
