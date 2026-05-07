import { useAsyncData } from "../../hooks/useAsyncData";
import { fetchJson } from "../../api/httpClient";
import { LoadingState, ErrorState } from "../../components/StateViews";
import { CarbonIcon } from "../../components/CarbonIcon";
import type { PublicEvent } from "../../mocks/data";

export function EventGallery() {
  const { data, error, isLoading, refetch } = useAsyncData(
    () => fetchJson<PublicEvent[]>("/api/events/public"),
    []
  );

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Events unavailable"} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
      <div className="mb-8">
        <h1 className="text-expressive-04 text-text-primary">Past Events</h1>
        <p className="mt-2 text-expressive-01 text-text-secondary max-w-2xl">
          A look back at our events, workshops, and community gatherings.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((event) => (
          <article
            key={event.id}
            className="group border border-border-subtle bg-surface transition-colors hover:border-border-strong"
          >
            <div className="flex h-48 items-center justify-center bg-carbon-gray-20">
              <CarbonIcon
                name="Calendar"
                size={48}
                className="text-carbon-gray-40"
                aria-hidden="true"
              />
            </div>
            <div className="p-5">
              <span className="inline-block border border-border-subtle px-2 py-0.5 text-xs text-text-secondary">
                {event.category}
              </span>
              <h2 className="mt-3 text-expressive-02 font-semibold text-text-primary">
                {event.title}
              </h2>
              <p className="mt-2 text-productive-02 text-text-secondary line-clamp-2">
                {event.description}
              </p>
              <p className="mt-3 text-xs text-text-placeholder">{event.date}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
