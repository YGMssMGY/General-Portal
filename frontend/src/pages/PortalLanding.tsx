import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ClickableTile, Layer, InlineLoading } from "@carbon/react";
import { useUIStore } from "../stores/useUIStore";

const portals = [
	{
		id: "stuco",
		label: "Student Council",
		description: "Manage student government — events, budgets, proposals, and elections.",
	},
	{
		id: "developers",
		label: "Developers Club",
		description: "Code, collaborate, and ship — project tracking, tasks, and team tools.",
	},
] as const;

export function PortalLanding() {
	const navigate = useNavigate();
	const portal = useUIStore((s) => s.portal);
	const setPortal = useUIStore((s) => s.setPortal);
	const [navigating, setNavigating] = useState(false);

	useEffect(() => {
		if (portal) {
			navigate(`/${portal}/dashboard`, { replace: true });
		}
	}, [portal, navigate]);

	function handleSelect(id: "developers" | "stuco") {
		setNavigating(true);
		setPortal(id);
	}

	return (
		<Layer>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					minHeight: "100vh",
					padding: "2rem",
				}}
			>
				<h1
					style={{
						fontSize: "2rem",
						fontWeight: 600,
						marginBottom: "0.5rem",
					}}
				>
					General Portal
				</h1>
				<p
					style={{
						marginBottom: "2rem",
						color: "var(--cds-text-secondary, #525252)",
					}}
				>
					Choose your organization to get started
				</p>

				<div
					style={{
						display: "flex",
						gap: "1rem",
						flexWrap: "wrap",
						justifyContent: "center",
					}}
				>
					{portals.map((p) => (
						<ClickableTile
							key={p.id}
							id={`portal-${p.id}`}
							onClick={() => handleSelect(p.id)}
							aria-label={`Select ${p.label} portal`}
							disabled={navigating}
							style={{
								padding: "2rem",
								textAlign: "center",
								width: "20rem",
								maxWidth: "100%",
							}}
						>
							<h2 style={{ marginBottom: "0.75rem", fontSize: "1.25rem" }}>
								{p.label}
							</h2>
							<p
								style={{
									color: "var(--cds-text-secondary, #525252)",
									fontSize: "0.875rem",
									lineHeight: 1.5,
								}}
							>
								{p.description}
							</p>
						</ClickableTile>
					))}
				</div>

				{navigating && (
					<div style={{ marginTop: "2rem" }}>
						<InlineLoading description="Redirecting..." />
					</div>
				)}

				{!navigating && (
					<p
						style={{
							marginTop: "2rem",
							fontSize: "0.75rem",
							color: "var(--cds-text-helper, #6f6f6f)",
						}}
					>
						Select a portal to continue. You can switch portals later from settings.
					</p>
				)}
			</div>
		</Layer>
	);
}
