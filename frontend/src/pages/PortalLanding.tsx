import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Grid, Row, Column, ClickableTile, Heading, Section } from "@carbon/react";
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
		<Grid style={{ minHeight: "100vh", alignItems: "center" }}>
			<Row>
				<Column sm={4} md={8} lg={16}>
					<Section style={{ textAlign: "center", marginBottom: "3rem" }}>
						<Heading>General Portal</Heading>
						<p
							style={{
								marginTop: "0.5rem",
								color: "var(--cds-text-secondary, #525252)",
							}}
						>
							Choose your organization to get started
						</p>
					</Section>
				</Column>
			</Row>
			<Row style={{ justifyContent: "center", gap: "1rem" }}>
				{portals.map((p) => (
					<Column key={p.id} sm={4} md={4} lg={6}>
						<ClickableTile
							id={`portal-${p.id}`}
							onClick={() => handleSelect(p.id)}
							aria-label={`Select ${p.label} portal`}
							style={{ padding: "2rem", textAlign: "center" }}
						>
							<Heading style={{ marginBottom: "0.75rem" }}>{p.label}</Heading>
							<p
								style={{
									color: "var(--cds-text-secondary, #525252)",
									fontSize: "0.875rem",
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
							marginTop: "3rem",
							fontSize: "0.75rem",
							color: "var(--cds-text-helper, #6f6f6f)",
						}}
					>
						Select a portal to continue. You can switch portals later from settings.
					</p>
				</Column>
			</Row>
		</Grid>
	);
}
