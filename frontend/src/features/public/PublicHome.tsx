import { Link } from "react-router-dom";
import { Button, Tile } from "@carbon/react";
import { ArrowRight, Calendar, Group, Launch } from "@carbon/icons-react";
import { getClientConfig } from "../../config/clientConfig";

const features = [
	{
		title: "Workshops & Events",
		description:
			"Hands-on coding workshops, hackathons, and networking events that bring students together.",
		icon: Calendar,
	},
	{
		title: "Leadership Development",
		description:
			"Opportunities to lead projects, manage teams, and develop professional skills.",
		icon: Group,
	},
	{
		title: "Community Impact",
		description:
			"Outreach programs, mentorship, and initiatives that make a difference in our school.",
		icon: Launch,
	},
];

export function PublicHome() {
	const config = getClientConfig();

	return (
		<div>
			<section
				style={{
					borderBottom: "1px solid var(--cds-border-subtle)",
					background: "var(--cds-layer)",
					padding: "4rem 0",
				}}
			>
				<div style={{ margin: "0 auto", maxWidth: "80rem", padding: "0 1rem" }}>
					<div style={{ maxWidth: "48rem" }}>
						<h1
							style={{
								fontSize: "2.5rem",
								fontWeight: 600,
								lineHeight: 1.2,
								color: "var(--cds-text-primary)",
							}}
						>
							{config.displayName}
						</h1>
						<p
							style={{
								marginTop: "1rem",
								fontSize: "1.25rem",
								lineHeight: 1.6,
								color: "var(--cds-text-secondary)",
								maxWidth: "42rem",
							}}
						>
							{config.tagline}
						</p>
						<div
							style={{
								marginTop: "2rem",
								display: "flex",
								flexWrap: "wrap",
								gap: "0.75rem",
							}}
						>
							<Link to="/events">
								<Button renderIcon={ArrowRight}>View Events</Button>
							</Link>
							<Link to="/about">
								<Button kind="tertiary">Learn More</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>

			<section style={{ padding: "4rem 0" }}>
				<div style={{ margin: "0 auto", maxWidth: "80rem", padding: "0 1rem" }}>
					<h2
						style={{
							fontSize: "2rem",
							fontWeight: 600,
							color: "var(--cds-text-primary)",
						}}
					>
						What We Do
					</h2>
					<div
						style={{
							marginTop: "2rem",
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
							gap: "1.5rem",
						}}
					>
						{features.map((item) => (
							<Tile key={item.title}>
								<item.icon
									size={32}
									style={{ color: "#0f62fe" }}
									aria-hidden="true"
								/>
								<h3
									style={{
										marginTop: "1rem",
										fontSize: "1.25rem",
										fontWeight: 600,
										color: "var(--cds-text-primary)",
									}}
								>
									{item.title}
								</h3>
								<p
									style={{
										marginTop: "0.5rem",
										fontSize: "0.875rem",
										lineHeight: 1.5,
										color: "var(--cds-text-secondary)",
									}}
								>
									{item.description}
								</p>
							</Tile>
						))}
					</div>
				</div>
			</section>

			<section
				style={{
					borderTop: "1px solid var(--cds-border-subtle)",
					background: "var(--cds-layer)",
					padding: "4rem 0",
					textAlign: "center",
				}}
			>
				<div style={{ margin: "0 auto", maxWidth: "80rem", padding: "0 1rem" }}>
					<h2
						style={{
							fontSize: "2rem",
							fontWeight: 600,
							color: "var(--cds-text-primary)",
						}}
					>
						Ready to Get Involved?
					</h2>
					<p
						style={{
							margin: "1rem auto 0",
							fontSize: "1rem",
							color: "var(--cds-text-secondary)",
							maxWidth: "36rem",
						}}
					>
						Join our community of passionate students. Attend an event, become a member,
						or just say hello.
					</p>
					<Link to="/about" style={{ marginTop: "1.5rem", display: "inline-block" }}>
						<Button renderIcon={ArrowRight}>About Our Organization</Button>
					</Link>
				</div>
			</section>
		</div>
	);
}
