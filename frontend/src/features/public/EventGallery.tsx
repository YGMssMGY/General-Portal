import { useAsyncData } from "../../hooks/useAsyncData";
import { fetchJson } from "../../api/httpClient";
import { LoadingState, ErrorState } from "../../components/StateViews";
import { Tile, Tag } from "@carbon/react";
import { Calendar } from "@carbon/icons-react";

interface PublicEvent {
    id: string;
    title: string;
    eventDate: string;
    description: string;
    category: string;
}

export function EventGallery() {
    const { data, error, isLoading, refetch } = useAsyncData(
        () => fetchJson<{ content: PublicEvent[] }>("/events/public"),
        [],
    );

    if (isLoading) return <LoadingState />;
    if (error || !data)
        return <ErrorState message={error ?? "Events unavailable"} onRetry={refetch} />;

    const events = Array.isArray(data) ? data : data.content;

    return (
        <div style={{ margin: "0 auto", maxWidth: "80rem", padding: "1.5rem 1rem" }}>
            <div style={{ marginBottom: "1rem" }}>
                <h1 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
                    Past Events
                </h1>
                <p
                    style={{
                        marginTop: "0.5rem",
                        fontSize: "1rem",
                        color: "var(--cds-text-secondary)",
                        maxWidth: "42rem",
                    }}
                >
                    A look back at our events, workshops, and community gatherings.
                </p>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                    gap: "1rem",
                    overflowX: "auto",
                    maxWidth: "100%",
                }}
            >
                {events.map((event) => (
                    <Tile key={event.id}>
                        <div
                            style={{
                                height: "8rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background: "var(--cds-layer-accent)",
                                marginBottom: "1.25rem",
                            }}
                        >
                            <Calendar
                                size={48}
                                style={{ color: "var(--cds-text-placeholder)" }}
                                aria-hidden="true"
                            />
                        </div>
                        <Tag type="outline">{event.category}</Tag>
                        <h2
                            style={{
                                marginTop: "0.75rem",
                                fontSize: "1.25rem",
                                fontWeight: 600,
                                color: "var(--cds-text-primary)",
                            }}
                        >
                            {event.title}
                        </h2>
                        <p
                            style={{
                                marginTop: "0.5rem",
                                fontSize: "0.875rem",
                                color: "var(--cds-text-secondary)",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                            }}
                        >
                            {event.description}
                        </p>
                        <p
                            style={{
                                marginTop: "0.75rem",
                                fontSize: "0.75rem",
                                color: "var(--cds-text-placeholder)",
                            }}
                        >
                            {event.eventDate ? new Date(event.eventDate).toLocaleDateString() : ""}
                        </p>
                    </Tile>
                ))}
            </div>
        </div>
    );
}
