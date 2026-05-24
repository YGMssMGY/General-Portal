"use client";

import { useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { format } from "date-fns";
import {
  Calendar,
  MapPin,
  Code2,
  GraduationCap,
  Image,
  Megaphone,
  Star,
  ExternalLink,
} from "lucide-react";

interface ShowcaseEvent {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  portal: "developers" | "stuco";
}

interface ShowcaseItem {
  id: string;
  type: "event_feature" | "announcement" | "gallery_image";
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface ShowcaseResponse {
  events: ShowcaseEvent[];
  galleries: ShowcaseItem[];
  announcements: ShowcaseItem[];
}

type FilterKey = "all" | "developers" | "stuco";

const portalFilters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "developers", label: "Developers' Club" },
  { key: "stuco", label: "Student Council" },
];

const portalLabel: Record<string, string> = {
  developers: "Developers' Club",
  stuco: "Student Council",
};

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

const portalLink: React.CSSProperties = {
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
  textDecoration: "none",
  transition: "background-color 150ms ease",
};

const tabsRow: React.CSSProperties = {
  display: "flex",
  gap: "4px",
  marginBottom: "24px",
  borderBottom: "1px solid var(--color-border)",
  paddingBottom: 0,
  overflowX: "auto",
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

const badge: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: "12px",
  fontWeight: 600,
  padding: "2px 8px",
  borderRadius: "5px",
  lineHeight: "20px",
};

const skeletonBlock: React.CSSProperties = {
  height: "14px",
  borderRadius: "5px",
  backgroundColor: "var(--color-bg-secondary)",
};

const skeletonDate: React.CSSProperties = {
  width: "52px",
  height: "52px",
  borderRadius: "5px",
  backgroundColor: "var(--color-bg-secondary)",
  flexShrink: 0,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
};

const galleryItem: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "32px 16px",
  border: "1px solid var(--color-border)",
  borderRadius: "5px",
  backgroundColor: "var(--color-bg-secondary)",
  textAlign: "center",
};

/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/alt-text */
export default function ShowcasePage() {
  usePageTitle("Showcase | General Portal");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const { data, isLoading, isError } = useQuery<ShowcaseResponse>({
    queryKey: ["public", "showcase"],
    queryFn: () => fetchJson<ShowcaseResponse>("/api/public/showcase"),
  });

  const events = data?.events ?? [];
  const announcements = data?.announcements ?? [];
  const galleryImages = data?.galleries ?? [];
  const hasShowcaseItems = announcements.length > 0 || galleryImages.length > 0 || (data?.events?.length ?? 0) > 0;

  const featuredEvents = events.slice(0, 5);

  const filteredEvents =
    activeFilter === "all"
      ? events
      : events.filter((e) => e.portal === activeFilter);

  return (
    <div style={container}>
      <div style={heroSection}>
        <h1 style={heroTitle}>Club Activities</h1>
        <p style={heroSubtitle}>Discover what our clubs are doing</p>
        <div style={portalLinks}>
          <Link href="/login?portal=developers" style={portalLink}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg)";
            }}
          >
            <Code2 size={16} />
            Sign in to Developers Club
          </Link>
          <Link href="/login?portal=stuco" style={portalLink}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg-secondary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-bg)";
            }}
          >
            <GraduationCap size={16} />
            Sign in to Student Council
          </Link>
        </div>
      </div>

      {/* Announcements section */}
      {hasShowcaseItems && announcements.length > 0 && (
        <div style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Megaphone size={18} style={{ color: "var(--color-primary)" }} />
            <h2 style={sectionTitle}>Announcements</h2>
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
                    Learn more <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Featured events section */}
      {hasShowcaseItems && featuredEvents.length > 0 && (
        <div style={{ marginBottom: "48px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Star size={18} style={{ color: "var(--color-primary)" }} />
            <h2 style={sectionTitle}>Featured Events</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {featuredEvents.map((item) => (
              <div
                key={item.id}
                style={{
                  ...eventCard,
                  alignItems: "center",
                }}
              >
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
                {(item as any).linkUrl && (
                    <a
                      href={(item as any).linkUrl}
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
                      View details <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events list */}
      <div style={{ marginBottom: "48px" }}>
        <div style={tabsRow}>
          {portalFilters.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                  backgroundColor: "transparent",
                  color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "color 150ms ease, border-color 150ms ease",
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ ...eventCard, alignItems: "center" }}>
                <div style={skeletonDate} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ ...skeletonBlock, width: "45%" }} />
                  <div style={{ ...skeletonBlock, width: "30%" }} />
                  <div style={{ ...skeletonBlock, width: "65%" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              border: "1px solid var(--color-border)",
              borderRadius: "5px",
            }}
          >
            <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
              Failed to load showcase data.
            </p>
          </div>
        )}

        {!isLoading && !isError && filteredEvents.length === 0 && !hasShowcaseItems && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              border: "1px solid var(--color-border)",
              borderRadius: "5px",
            }}
          >
            <Calendar size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
              No public events scheduled
            </p>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
              Check back later for upcoming activities.
            </p>
          </div>
        )}

        {!isLoading && !isError && filteredEvents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredEvents.map((event) => (
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
                        ...badge,
                        backgroundColor:
                          event.portal === "developers"
                            ? "var(--color-primary-light)"
                            : "#fef8e7",
                        color:
                          event.portal === "developers"
                            ? "var(--color-primary)"
                            : "#b28600",
                      }}
                    >
                      {portalLabel[event.portal] ?? event.portal}
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

      {/* Gallery section */}
      <div>
        <h2 style={sectionTitle}>Gallery</h2>
        <p style={sectionSubtitle}>Photos and media from our events</p>
        {hasShowcaseItems && galleryImages.length > 0 ? (
          <div style={grid}>
            {galleryImages.map((item) => (
              <div
                key={item.id}
                style={{
                  ...galleryItem,
                  backgroundColor: "var(--color-bg)",
                  padding: "16px",
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
                  <Image
                    size={32}
                    aria-hidden="true"
                    style={{ color: "var(--color-text-secondary)", marginBottom: "8px" }}
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
          <div style={grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={galleryItem}>
                <Image size={24} style={{ color: "var(--color-text-secondary)" }} />
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  Gallery {i + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
