"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

export interface PublicPortal {
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
}

export function PortalGrid({ portals }: { portals: PublicPortal[] }) {
    const t = useTranslations("landing");
    const router = useRouter();
    const [hovered, setHovered] = useState<string | null>(null);
    usePageTitle(t("title"));

    if (portals.length === 0) {
        return (
            <p
                style={{
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                    margin: "32px 0",
                }}
            >
                {t("noPortals")}
            </p>
        );
    }

    return (
        <>
            <div className="flex flex-col md:flex-row gap-4">
                {portals.map((portal) => {
                    const isHovered = hovered === portal.slug;
                    return (
                        <button
                            key={portal.slug}
                            type="button"
                            onClick={() => {
                                document.cookie = `portal=${portal.slug}; path=/; SameSite=Lax`;
                                router.push(`/${portal.slug}/dashboard`);
                            }}
                            onMouseEnter={() => setHovered(portal.slug)}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={() => setHovered(portal.slug)}
                            onBlur={() => setHovered(null)}
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                textAlign: "center",
                                padding: "40px 24px",
                                backgroundColor: "var(--color-bg)",
                                border: `2px solid ${isHovered ? "var(--color-primary)" : "var(--color-border)"}`,
                                borderRadius: "var(--radius-md)",
                                cursor: "pointer",
                                transition: "border-color 150ms ease, background-color 150ms ease",
                                outline: "none",
                                minHeight: "220px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "64px",
                                    height: "64px",
                                    borderRadius: "var(--radius-md)",
                                    backgroundColor: isHovered
                                        ? "var(--color-primary-light)"
                                        : "var(--color-bg-secondary)",
                                    marginBottom: "20px",
                                    transition: "background-color 150ms ease",
                                }}
                            >
                                <Building2
                                    size={28}
                                    style={{
                                        color: isHovered
                                            ? "var(--color-primary)"
                                            : "var(--color-text-secondary)",
                                        transition: "color 150ms ease",
                                    }}
                                />
                            </div>
                            <h2
                                style={{
                                    fontSize: "20px",
                                    fontWeight: 600,
                                    color: "var(--color-text)",
                                    margin: 0,
                                    marginBottom: "8px",
                                }}
                            >
                                {portal.name}
                            </h2>
                            {portal.description && (
                                <p
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                        margin: 0,
                                        lineHeight: 1.5,
                                        maxWidth: "260px",
                                    }}
                                >
                                    {portal.description}
                                </p>
                            )}
                        </button>
                    );
                })}
            </div>

            <Link
                href="/showcase"
                style={{
                    display: "block",
                    textAlign: "center",
                    marginTop: "32px",
                    fontSize: "14px",
                    color: "var(--color-primary)",
                    fontWeight: 500,
                    textDecoration: "none",
                }}
                onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.textDecoration = "underline";
                }}
                onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.textDecoration = "none";
                }}
            >
                {t("viewShowcase")} &rarr;
            </Link>
        </>
    );
}
