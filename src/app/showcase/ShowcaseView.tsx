"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Calendar, MapPin, Star, Megaphone, Image as ImageIcon, ExternalLink } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { LinkPreview } from "@/components/LinkPreview";

export interface PublicPortal {
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
}

export interface ShowcaseEvent {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    location: string | null;
    portal: string;
}

export interface ShowcaseCard {
    id: string;
    type: string;
    title: string;
    description: string | null;
    imageUrl: string | null;
    linkUrl: string | null;
    createdAt: string;
    portal: string;
}

export interface ShowcaseData {
    events: ShowcaseEvent[];
    galleries: ShowcaseCard[];
    announcements: ShowcaseCard[];
}

const container: React.CSSProperties = {
    maxWidth: "960px",
    margin: "0 auto",
    padding: "32px 24px 64px",
};

const heroSection: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
};

const heroTitle: React.CSSProperties = {
    fontSize: "32px",
    fontWeight: 700,
    color: "var(--color-text)",
    margin: 0,
    lineHeight: 1.2,
};

const heroSubtitle: React.CSSProperties = {
    fontSize: "15px",
    color: "var(--color-text-secondary)",
    margin: "12px 0 0",
    lineHeight: 1.5,
};

const portalLinks: React.CSSProperties = {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    marginTop: "24px",
    flexWrap: "wrap",
};

const sectionTitle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--color-text)",
    margin: "0 0 16px",
    lineHeight: 1.3,
};

const sectionSubtitle: React.CSSProperties = {
    fontSize: "14px",
    color: "var(--color-text-secondary)",
    margin: "0 0 16px",
    lineHeight: 1.5,
};

const eventCard: React.CSSProperties = {
    display: "flex",
    gap: "16px",
    padding: "20px",
    border: "1px solid var(--color-border)",
    borderRadius: "5px",
    backgroundColor: "var(--color-bg)",
};

const dateBlock: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "52px",
    padding: "8px 12px",
    border: "1px solid var(--color-border)",
    borderRadius: "5px",
    flexShrink: 0,
};

const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
};

function setPortalCookie(slug: string): void {
    document.cookie = `portal=${slug}; path=/; SameSite=Lax`;
}

export function ShowcaseView({
    portals,
    data,
    failed,
}: {
    portals: PublicPortal[];
    data: ShowcaseData | null;
    failed: boolean;
}) {
    const t = useTranslations("showcase");
    const tc = useTranslations("common");
    const router = useRouter();
    const [filter, setFilter] = useState<string>("all");
    usePageTitle(`${t("title")} | General Portal`);

    const events = data?.events ?? [];
    const announcements = data?.announcements ?? [];
    const galleries = data?.galleries ?? [];
    const featured = events.slice(0, 5);
    const visible = filter === "all" ? events : events.filter((e) => e.portal === filter);
    const portalName = (slug: string) => portals.find((p) => p.slug === slug)?.name ?? slug;

    return (
        <div style={container}>
            <div style={heroSection}>
                <h1 style={heroTitle}>{t("title")}</h1>
                <p style={heroSubtitle}>{t("subtitle")}</p>
                <div style={portalLinks}>
                    {portals.map((p) => (
                        <button
                            key={p.slug}
                            type="button"
                            onClick={() => {
                                setPortalCookie(p.slug);
                                router.push("/login");
                            }}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "10px 20px",
                                border: "1px solid var(--color-border)",
                                borderRadius: "5px",
                                fontSize: "14px",
                                fontWeight: 500,
                                color: "var(--color-primary)",
                                backgroundColor: "var(--color-bg)",
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                            onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.backgroundColor =
                                    "var(--color-bg-secondary)";
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.backgroundColor =
                                    "var(--color-bg)";
                            }}
                        >
                            {t("signInTo", { name: p.name })}
                        </button>
                    ))}
                </div>
            </div>

            {failed && (
                <div
                    style={{
                        textAlign: "center",
                        padding: "48px 24px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                    }}
                >
                    <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
                        {t("loadFailed")}
                    </p>
                </div>
            )}

            {!failed && announcements.length > 0 && (
                <div style={{ marginBottom: "48px" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "16px",
                        }}
                    >
                        <Megaphone size={18} style={{ color: "var(--color-primary)" }} />
                        <h2 style={sectionTitle}>{t("announcements")}</h2>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {announcements.map((item) => (
                            <div
                                key={item.id}
                                style={{
                                    padding: "16px 20px",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "5px",
                                    backgroundColor: "var(--color-bg)",
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {item.title}
                                </h3>
                                {item.description && (
                                    <p
                                        style={{
                                            fontSize: "13px",
                                            color: "var(--color-text-secondary)",
                                            margin: 0,
                                            lineHeight: 1.5,
                                        }}
                                    >
                                        {item.description}
                                    </p>
                                )}
                                {item.linkUrl && (
                                    <a
                                        href={item.linkUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "4px",
                                            fontSize: "13px",
                                            color: "var(--color-primary)",
                                            marginTop: "8px",
                                            textDecoration: "none",
                                        }}
                                    >
                                        {t("linkUrl")} <ExternalLink size={12} />
                                    </a>
                                )}
                                {item.linkUrl && <LinkPreview url={item.linkUrl} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!failed && featured.length > 0 && (
                <div style={{ marginBottom: "48px" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "16px",
                        }}
                    >
                        <Star size={18} style={{ color: "var(--color-primary)" }} />
                        <h2 style={sectionTitle}>{t("featuredEvents")}</h2>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {featured.map((item) => (
                            <div key={item.id} style={{ ...eventCard, alignItems: "center" }}>
                                <div
                                    style={{
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "5px",
                                        backgroundColor: "var(--color-primary-light)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        color: "var(--color-primary)",
                                    }}
                                >
                                    <Star size={22} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3
                                        style={{
                                            fontSize: "15px",
                                            fontWeight: 600,
                                            color: "var(--color-text)",
                                            margin: "0 0 4px",
                                        }}
                                    >
                                        {item.title}
                                    </h3>
                                    {item.description && (
                                        <p
                                            style={{
                                                fontSize: "13px",
                                                color: "var(--color-text-secondary)",
                                                margin: 0,
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                            }}
                                        >
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {!failed && (
                <div style={{ marginBottom: "48px" }}>
                    <div
                        style={{
                            display: "flex",
                            gap: "4px",
                            marginBottom: "24px",
                            borderBottom: "1px solid var(--color-border)",
                            overflowX: "auto",
                        }}
                    >
                        {[{ slug: "all", name: tc("all") }, ...portals].map((f) => {
                            const isActive = filter === f.slug;
                            return (
                                <button
                                    key={f.slug}
                                    type="button"
                                    onClick={() => setFilter(f.slug)}
                                    style={{
                                        padding: "10px 16px",
                                        border: "none",
                                        borderBottom: isActive
                                            ? "2px solid var(--color-primary)"
                                            : "2px solid transparent",
                                        backgroundColor: "transparent",
                                        color: isActive
                                            ? "var(--color-primary)"
                                            : "var(--color-text-secondary)",
                                        fontSize: "14px",
                                        fontWeight: isActive ? 600 : 400,
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                        fontFamily: "inherit",
                                        transition: "color 150ms ease, border-color 150ms ease",
                                    }}
                                >
                                    {f.name}
                                </button>
                            );
                        })}
                    </div>

                    {visible.length === 0 && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "48px 24px",
                                border: "1px solid var(--color-border)",
                                borderRadius: "5px",
                            }}
                        >
                            <Calendar
                                size={32}
                                style={{
                                    color: "var(--color-text-secondary)",
                                    marginBottom: "12px",
                                }}
                            />
                            <p
                                style={{
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    color: "var(--color-text)",
                                    margin: "0 0 4px",
                                }}
                            >
                                {t("noEvents")}
                            </p>
                            <p
                                style={{
                                    fontSize: "13px",
                                    color: "var(--color-text-secondary)",
                                    margin: 0,
                                }}
                            >
                                {t("noEventsHint")}
                            </p>
                        </div>
                    )}

                    {visible.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {visible.map((event) => (
                                <div key={event.id} style={eventCard}>
                                    <div style={dateBlock}>
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: 700,
                                                color: "var(--color-primary)",
                                                textTransform: "uppercase" as const,
                                                lineHeight: 1,
                                            }}
                                        >
                                            {format(event.startDate, "MMM")}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: "20px",
                                                fontWeight: 700,
                                                color: "var(--color-text)",
                                                lineHeight: 1.2,
                                            }}
                                        >
                                            {format(event.startDate, "d")}
                                        </span>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                flexWrap: "wrap",
                                                marginBottom: "4px",
                                            }}
                                        >
                                            <h3
                                                style={{
                                                    fontSize: "15px",
                                                    fontWeight: 600,
                                                    color: "var(--color-text)",
                                                    margin: 0,
                                                    lineHeight: 1.3,
                                                }}
                                            >
                                                {event.title}
                                            </h3>
                                            <span
                                                style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    padding: "2px 8px",
                                                    borderRadius: "5px",
                                                    lineHeight: "20px",
                                                    backgroundColor: "var(--color-primary-light)",
                                                    color: "var(--color-primary)",
                                                }}
                                            >
                                                {portalName(event.portal)}
                                            </span>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                flexWrap: "wrap",
                                                marginBottom: "8px",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    color: "var(--color-text-secondary)",
                                                }}
                                            >
                                                {format(event.startDate, "MMM d, yyyy")}
                                            </span>
                                            {event.location && (
                                                <span
                                                    style={{
                                                        fontSize: "12px",
                                                        color: "var(--color-text-secondary)",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px",
                                                    }}
                                                >
                                                    <MapPin size={12} />
                                                    {event.location}
                                                </span>
                                            )}
                                        </div>
                                        {event.description && (
                                            <p
                                                style={{
                                                    fontSize: "13px",
                                                    color: "var(--color-text-secondary)",
                                                    margin: 0,
                                                    lineHeight: 1.5,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                {event.description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {!failed && (
                <div>
                    <h2 style={sectionTitle}>{t("gallery")}</h2>
                    <p style={sectionSubtitle}>{t("gallerySubtitle")}</p>
                    {galleries.length > 0 ? (
                        <div style={grid}>
                            {galleries.map((item) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "8px",
                                        padding: "16px",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: "5px",
                                        backgroundColor: "var(--color-bg)",
                                        textAlign: "center",
                                    }}
                                >
                                    {item.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={item.imageUrl}
                                            alt={item.title}
                                            style={{
                                                width: "100%",
                                                height: "auto",
                                                aspectRatio: "16 / 9",
                                                objectFit: "contain",
                                                backgroundColor: "var(--color-bg-secondary)",
                                                borderRadius: "5px",
                                                marginBottom: "8px",
                                            }}
                                        />
                                    ) : (
                                        <ImageIcon
                                            size={32}
                                            aria-hidden="true"
                                            style={{
                                                color: "var(--color-text-secondary)",
                                                marginBottom: "8px",
                                            }}
                                        />
                                    )}
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            fontWeight: 500,
                                            color: "var(--color-text)",
                                            textAlign: "center",
                                        }}
                                    >
                                        {item.title}
                                    </span>
                                    {item.description && (
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                color: "var(--color-text-secondary)",
                                                textAlign: "center",
                                            }}
                                        >
                                            {item.description}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "48px 24px",
                                border: "1px solid var(--color-border)",
                                borderRadius: "5px",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "14px",
                                    color: "var(--color-text-secondary)",
                                    margin: 0,
                                }}
                            >
                                {t("noItems")}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
