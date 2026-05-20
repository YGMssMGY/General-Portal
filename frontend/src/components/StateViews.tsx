import { InlineLoading, Button, Tile } from "@carbon/react";

interface LoadingStateProps {
	label?: string;
}

export function LoadingState({ label = "Loading data" }: LoadingStateProps) {
	return (
		<Tile
			style={{
				minHeight: "12rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
		>
			<InlineLoading description={label} />
		</Tile>
	);
}

interface ErrorStateProps {
	message: string;
	onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
	return (
		<Tile style={{ borderLeft: "4px solid var(--cds-support-error)" }}>
			<p className="cds--type-productive-heading-01">Could not load data</p>
			<p
				className="cds--type-body-01"
				style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}
			>
				{message}
			</p>
			{onRetry ? (
				<Button
					kind="tertiary"
					size="sm"
					onClick={onRetry}
					style={{ marginTop: "0.75rem" }}
				>
					Try again
				</Button>
			) : null}
		</Tile>
	);
}

interface EmptyStateProps {
	title: string;
	description: string;
	action?: React.ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
	return (
		<Tile style={{ textAlign: "center", padding: "2rem" }}>
			<h2 className="cds--type-heading-02">{title}</h2>
			<p
				className="cds--type-body-01"
				style={{ marginTop: "0.5rem", color: "var(--cds-text-secondary)" }}
			>
				{description}
			</p>
			{action ? <div style={{ marginTop: "1rem" }}>{action}</div> : null}
		</Tile>
	);
}
