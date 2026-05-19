import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Grid, Row, Column, ClickableTile, Layer } from "@carbon/react";
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

	useEffect(() => {
		if (portal) {
			navigate(`/${portal}/dashboard`, { replace: true });
		}
	}, [portal, navigate]);

	function handleSelect(id: "developers" | "stuco") {
		setPortal(id);
		navigate(`/${id}/dashboard`);
	}

	return (
		<Layer>
			<Grid
				style={{
					minHeight: "100vh",
					alignContent: "center",
					padding: "2rem 0",
				}}
			>
				<Row>
					<Column sm={4} md={8} lg={16}>
						<h1
							style={{
								textAlign: "center",
								marginBottom: "0.5rem",
								fontSize: "2rem",
								fontWeight: 600,
							}}
						>
							General Portal
						</h1>
						<p
							style={{
								textAlign: "center",
								marginBottom: "2rem",
								color: "var(--cds-text-secondary, #525252)",
							}}
						>
							Choose your organization to get started
						</p>
					</Column>
				</Row>
				<Row style={{ justifyContent: "center" }}>
					{portals.map((p) => (
						<Column key={p.id} sm={4} md={4} lg={6} style={{ marginBottom: "1rem" }}>
							<ClickableTile
								id={`portal-${p.id}`}
								onClick={() => handleSelect(p.id)}
								aria-label={`Select ${p.label} portal`}
								style={{
									padding: "2rem",
									textAlign: "center",
									height: "100%",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
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
						</Column>
					))}
				</Row>
				<Row>
					<Column sm={4} md={8} lg={16}>
						<p
							style={{
								textAlign: "center",
								marginTop: "2rem",
								fontSize: "0.75rem",
								color: "var(--cds-text-helper, #6f6f6f)",
							}}
						>
							Select a portal to continue. You can switch portals later from settings.
						</p>
					</Column>
				</Row>
			</Grid>
		</Layer>
	);
}
