import { Link } from "react-router-dom";
import { Button } from "@carbon/react";
import { Document } from "@carbon/icons-react";

export function NotFoundPage() {
	return (
		<div
			style={{
				display: "flex",
				minHeight: "calc(100vh - 6rem)",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				padding: "3rem 1.5rem",
			}}
		>
			<Document size={48} style={{ color: "var(--cds-text-secondary)" }} aria-hidden="true" />
			<h1
				style={{
					marginTop: "1.5rem",
					fontSize: "1.25rem",
					fontWeight: 600,
					color: "var(--cds-text-primary)",
				}}
			>
				Page not found
			</h1>
			<p
				style={{
					marginTop: "0.5rem",
					fontSize: "0.875rem",
					color: "var(--cds-text-secondary)",
				}}
			>
				The page you are looking for does not exist or has been moved.
			</p>
			<Link to="/" style={{ marginTop: "1.5rem" }}>
				<Button kind="tertiary">Go Home</Button>
			</Link>
		</div>
	);
}
