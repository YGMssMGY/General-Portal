import type { ReactNode } from "react";

interface PageHeaderProps {
	title: string;
	description?: string | ReactNode;
	actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<div
			style={{
				marginBottom: "1.5rem",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				gap: "1rem",
				borderBottom: "1px solid var(--cds-border-subtle)",
				paddingBottom: "1rem",
			}}
		>
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					alignItems: "flex-end",
					justifyContent: "space-between",
					gap: "1rem",
				}}
			>
				<div>
					<h1 className="cds--productive-heading-03">{title}</h1>
					{description ? (
						typeof description === "string" ? (
							<p
								className="cds--type-body-01"
								style={{
									marginTop: "0.25rem",
									color: "var(--cds-text-secondary)",
								}}
							>
								{description}
							</p>
						) : (
							<div
								className="cds--type-body-01"
								style={{
									marginTop: "0.25rem",
									color: "var(--cds-text-secondary)",
								}}
							>
								{description}
							</div>
						)
					) : null}
				</div>
				{actions ? (
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "center",
							gap: "0.75rem",
						}}
					>
						{actions}
					</div>
				) : null}
			</div>
		</div>
	);
}
