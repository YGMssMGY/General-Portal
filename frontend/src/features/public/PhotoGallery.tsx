import { useAsyncData } from "../../hooks/useAsyncData";
import { fetchJson } from "../../api/httpClient";
import { LoadingState, ErrorState } from "../../components/StateViews";
import { Tile } from "@carbon/react";
import { Folder } from "@carbon/icons-react";

interface Photo {
	id: string;
	title: string;
	date: string;
	description: string;
}

export function PhotoGallery() {
	const { data, error, isLoading, refetch } = useAsyncData(
		() => fetchJson<{ content: Photo[] }>("/api/photos"),
		[],
	);

	if (isLoading) return <LoadingState />;
	if (error || !data)
		return <ErrorState message={error ?? "Photos unavailable"} onRetry={refetch} />;

	return (
		<div style={{ margin: "0 auto", maxWidth: "80rem", padding: "1.5rem 1rem" }}>
			<div style={{ marginBottom: "1rem" }}>
				<h1 style={{ fontSize: "2rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
					Photo Gallery
				</h1>
				<p
					style={{
						marginTop: "0.5rem",
						fontSize: "1rem",
						color: "var(--cds-text-secondary)",
						maxWidth: "42rem",
					}}
				>
					Moments captured from our events, workshops, and community activities.
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
				{(data?.content ?? []).map((photo) => (
					<Tile key={photo.id}>
						<div
							style={{
								aspectRatio: "4/3",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								background: "var(--cds-layer-accent)",
								marginBottom: "0.75rem",
							}}
						>
							<Folder
								size={40}
								style={{ color: "var(--cds-text-placeholder)" }}
								aria-hidden="true"
							/>
						</div>
						<p
							style={{
								fontSize: "0.875rem",
								fontWeight: 500,
								color: "var(--cds-text-primary)",
							}}
						>
							{photo.title}
						</p>
						<p
							style={{
								marginTop: "0.125rem",
								fontSize: "0.75rem",
								color: "var(--cds-text-placeholder)",
							}}
						>
							{photo.date}
						</p>
					</Tile>
				))}
			</div>
		</div>
	);
}
