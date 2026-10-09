import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { PortalGrid, type PublicPortal } from "./PortalGrid";

export const dynamic = "force-dynamic";

export const metadata = { title: "General Portal" };

async function getPortals(): Promise<PublicPortal[] | null> {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("host") ?? "localhost:3000";
    const res = await fetch(`${proto}://${host}/api/public/portals`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: PublicPortal[] };
    return json.success ? (json.data ?? []) : null;
}

export default async function HomePage() {
    const t = await getTranslations("landing");
    const portals = await getPortals();

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
