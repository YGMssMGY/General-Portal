import { useAsyncData } from "../../hooks/useAsyncData";
import { fetchJson } from "../../api/httpClient";
import { LoadingState, ErrorState } from "../../components/StateViews";
import { CarbonIcon } from "../../components/CarbonIcon";

interface Photo {
  id: string;
  title: string;
  date: string;
  description: string;
}

export function PhotoGallery() {
  const { data, error, isLoading, refetch } = useAsyncData(
    () => fetchJson<Photo[]>("/api/photos"),
    []
  );

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Photos unavailable"} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-6 lg:py-16">
      <div className="mb-8">
        <h1 className="text-expressive-04 text-text-primary">Photo Gallery</h1>
        <p className="mt-2 text-expressive-01 text-text-secondary max-w-2xl">
          Moments captured from our events, workshops, and community activities.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((photo) => (
          <figure
            key={photo.id}
            className="group border border-border-subtle bg-surface transition-colors hover:border-border-strong"
          >
            <div className="flex aspect-[4/3] items-center justify-center bg-carbon-gray-20">
              <CarbonIcon
                name="Folder"
                size={40}
                className="text-carbon-gray-40"
                aria-hidden="true"
              />
            </div>
            <figcaption className="p-3">
              <p className="text-sm font-medium text-text-primary">{photo.title}</p>
              <p className="mt-0.5 text-xs text-text-placeholder">{photo.date}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
