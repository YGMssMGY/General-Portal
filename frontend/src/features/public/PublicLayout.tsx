import { Outlet, Link, useLocation } from "react-router-dom";

const navLinkStyle: React.CSSProperties = {
	padding: "0.5rem 0.75rem",
	fontSize: "0.875rem",
	color: "var(--cds-text-secondary)",
	textDecoration: "none",
};

const activeNavStyle: React.CSSProperties = {
	...navLinkStyle,
	color: "var(--cds-text-primary)",
	fontWeight: 600,
};

export function PublicLayout() {
	const location = useLocation();
	const isActive = (path: string) => location.pathname === path;

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				background: "var(--cds-background)",
				color: "var(--cds-text-primary)",
			}}
		>
			<header
				style={{
					position: "sticky",
					top: 0,
					zIndex: 40,
					borderBottom: "1px solid var(--cds-border-subtle)",
					background: "var(--cds-layer)",
				}}
			>
				<div
					style={{
						margin: "0 auto",
						maxWidth: "80rem",
						display: "flex",
						height: "3.5rem",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "0 1rem",
					}}
				>
					<Link
						to="/"
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.75rem",
							color: "var(--cds-text-primary)",
							textDecoration: "none",
						}}
					>
						<span style={{ fontSize: "1.125rem", fontWeight: 600 }}>
							General Portal
						</span>
					</Link>
					<nav
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.25rem",
							overflowX: "auto",
						}}
					>
						<Link
							to="/events"
							style={isActive("/events") ? activeNavStyle : navLinkStyle}
						>
							Events
						</Link>
						<Link
							to="/photos"
							style={isActive("/photos") ? activeNavStyle : navLinkStyle}
						>
							Photos
						</Link>
						<Link
							to="/about"
							style={isActive("/about") ? activeNavStyle : navLinkStyle}
						>
							About
						</Link>
					</nav>
				</div>
			</header>
			<main style={{ flex: 1 }}>
				<Outlet />
			</main>
			<footer
				style={{
					borderTop: "1px solid var(--cds-border-subtle)",
					background: "var(--cds-layer)",
				}}
			>
				<div style={{ margin: "0 auto", maxWidth: "80rem", padding: "2rem 1rem" }}>
					<p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
						&copy; {new Date().getFullYear()} General Portal. All rights reserved.
					</p>
				</div>
			</footer>
		</div>
	);
}
