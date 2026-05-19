import { SkeletonText, SkeletonPlaceholder, Tile } from "@carbon/react";

export function DashboardSkeleton() {
	return (
		<div>
			<div style={{ marginBottom: "2rem" }}>
				<SkeletonText heading width="300px" />
				<SkeletonText width="400px" />
			</div>
			<div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
				{[1, 2, 3, 4, 5].map((i) => (
					<Tile key={i} style={{ flex: 1, padding: "1.5rem" }}>
						<SkeletonPlaceholder
							style={{ width: "2rem", height: "2rem", marginBottom: "0.75rem" }}
						/>
						<SkeletonText heading width="40px" />
						<SkeletonText width="80px" />
					</Tile>
				))}
			</div>
			<div style={{ display: "flex", gap: "1rem" }}>
				<Tile style={{ flex: 2, padding: "1.5rem" }}>
					<SkeletonText heading width="200px" />
					{[1, 2, 3].map((i) => (
						<div key={i} style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
							<SkeletonPlaceholder
								style={{ width: "2rem", height: "2rem", borderRadius: "50%" }}
							/>
							<div style={{ flex: 1 }}>
								<SkeletonText width="60%" />
								<SkeletonText width="40%" />
							</div>
						</div>
					))}
				</Tile>
				<Tile style={{ flex: 1, padding: "1.5rem" }}>
					<SkeletonText heading width="150px" />
					{[1, 2, 3].map((i) => (
						<div key={i} style={{ marginTop: "1rem" }}>
							<SkeletonText width="80%" />
							<SkeletonText width="50%" />
						</div>
					))}
				</Tile>
			</div>
		</div>
	);
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div>
			<div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
				<SkeletonPlaceholder style={{ width: "12rem", height: "2rem" }} />
				<SkeletonPlaceholder style={{ width: "8rem", height: "2rem" }} />
			</div>
			<Tile style={{ padding: 0 }}>
				{[1, 2, 3, 4, 5].slice(0, rows).map((i) => (
					<div
						key={i}
						style={{
							display: "flex",
							gap: "1rem",
							padding: "0.75rem 1rem",
							borderBottom:
								i < rows ? "1px solid var(--cds-border-subtle)" : undefined,
						}}
					>
						<SkeletonPlaceholder style={{ width: "1rem", height: "1rem" }} />
						<SkeletonText width="30%" />
						<SkeletonText width="20%" />
						<SkeletonText width="25%" />
						<SkeletonText width="15%" />
					</div>
				))}
			</Tile>
		</div>
	);
}

export function CardSkeleton() {
	return (
		<Tile style={{ padding: "1.5rem" }}>
			<SkeletonText heading width="60%" />
			<SkeletonText width="100%" />
			<SkeletonText width="80%" />
			<div style={{ marginTop: "1rem" }}>
				<SkeletonPlaceholder
					style={{ width: "100%", height: "0.5rem", borderRadius: "4px" }}
				/>
			</div>
		</Tile>
	);
}
