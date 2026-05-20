import { memo } from "react";
import { Link } from "react-router-dom";
import { Tag, Button, ClickableTile, Tile, Grid, Column, Row, Stack } from "@carbon/react";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState, EmptyState } from "../../components/StateViews";
import { useAuth } from "../../context/AuthContext";
import { useDashboard } from "../../hooks/useWorkspaceResources";
import { useUIStore } from "../../stores/useUIStore";
import { formatDate } from "../../utils/format";
import {
	ArrowRight,
	Task,
	Document,
	Calendar,
	Warning,
	Chat,
	Event,
	User,
} from "@carbon/icons-react";
import type { DashboardMetric } from "../../types";
import type { ComponentType } from "react";
import { SimpleBarChart } from "@carbon/charts-react";
import "@carbon/charts/styles.css";
import { isToday, parseISO } from "date-fns";

const metricIcons: Record<string, ComponentType<any>> = {
	Task,
	Document,
	Calendar,
	Warning,
	Forum: Chat,
	Payment: Calendar,
};

function getMetricLinks(portal: string): Record<string, string> {
	return {
		"Open Tasks": `/${portal}/tasks`,
		"Pending Proposals": `/${portal}/proposals`,
		"Upcoming Events": `/${portal}/events`,
		"Unread Messages": `/${portal}/messages`,
	};
}

const toneIconColors: Record<string, string> = {
	primary: "var(--cds-support-info)",
	secondary: "var(--cds-support-success)",
	tertiary: "var(--cds-support-success)",
	danger: "var(--cds-support-error)",
	neutral: "var(--cds-text-secondary)",
};

function makeSparklineData(value: string, label: string) {
	const num = Number.parseFloat(value) || 0;
	const points = [num * 0.6, num * 0.85, num * 1.0, num * 0.9, num * 1.1, num];
	return points.map((v, i) => ({ group: label, key: String(i), value: Math.round(v) }));
}

const MetricSparkline = memo(function MetricSparkline({ metric }: { metric: DashboardMetric }) {
	const data = makeSparklineData(metric.value, metric.label);
	const colorMap: Record<string, string> = {
		primary: "#0f62fe",
		secondary: "#24a148",
		tertiary: "#007d79",
		danger: "#da1e28",
		neutral: "#6f6f6f",
	};
	return (
		<SimpleBarChart
			data={data}
			options={{
				axes: { left: { visible: false }, bottom: { visible: false } },
				toolbar: { enabled: false },
				height: "40px",
				color: { scale: { [metric.label]: colorMap[metric.tone] ?? "#0f62fe" } },
			}}
		/>
	);
});

const MetricCard = memo(function MetricCard({
	metric,
	portal,
}: {
	metric: DashboardMetric;
	portal: string;
}) {
	const Icon = metricIcons[metric.icon] ?? Task;
	const link = getMetricLinks(portal)[metric.label];
	const iconColor = toneIconColors[metric.tone];

	const inner = (
		<Stack gap={4}>
			<div
				style={{
					display: "flex",
					alignItems: "flex-start",
					justifyContent: "space-between",
				}}
			>
				<Icon size={24} style={{ color: iconColor }} aria-hidden="true" />
			</div>
			<div>
				<p
					className="cds--type-productive-heading-03"
					style={{ margin: 0, color: "var(--cds-text-primary)" }}
				>
					{metric.value}
				</p>
				<p
					className="cds--type-label"
					style={{
						margin: 0,
						color: "var(--cds-text-secondary)",
						textTransform: "uppercase",
						letterSpacing: "0.025em",
					}}
				>
					{metric.label}
				</p>
			</div>
			<MetricSparkline metric={metric} />
		</Stack>
	);

	if (link) {
		return <ClickableTile href={link}>{inner}</ClickableTile>;
	}

	return <Tile>{inner}</Tile>;
});

const quotes = [
	"The secret of getting ahead is getting started. \u2014 Mark Twain",
	"It does not matter how slowly you go as long as you do not stop. \u2014 Confucius",
	"Quality is not an act, it is a habit. \u2014 Aristotle",
	"The only way to do great work is to love what you do. \u2014 Steve Jobs",
	"What you do today can improve all your tomorrows. \u2014 Ralph Marston",
	"Success is the sum of small efforts repeated day in and day out. \u2014 Robert Collier",
	"Believe you can and you are halfway there. \u2014 Theodore Roosevelt",
	"The best time to plant a tree was 20 years ago. The second best time is now.",
	"Everything you\u2019ve ever wanted is on the other side of fear. \u2014 George Addair",
	"Your limitation\u2014it\u2019s only your imagination.",
];

function dailyQuote(): string {
	const start = new Date(new Date().getFullYear(), 0, 0);
	const diff = (+new Date() - +start + 864e5) / 864e5;
	return quotes[Math.floor(diff) % quotes.length];
}

function countToday(
	items: { dueDate?: string; startsAt?: string }[],
	field: "dueDate" | "startsAt",
): number {
	return items.filter((item) => {
		const val = item[field];
		return val ? isToday(parseISO(val)) : false;
	}).length;
}

function getQuickActions(portal: string) {
	return [
		{ label: "New Task", icon: Task, to: `/${portal}/tasks` },
		{ label: "New Proposal", icon: Document, to: `/${portal}/proposals` },
		{ label: "New Event", icon: Event, to: `/${portal}/events` },
		{ label: "Send Message", icon: Chat, to: `/${portal}/messages` },
		{ label: "My Account", icon: User, to: `/${portal}/accounts` },
	];
}

export function DashboardPage() {
	const { user } = useAuth();
	const portal = useUIStore((s) => s.portal) || "developers";
	const { data, error, isLoading, refetch } = useDashboard();
	const greeting = ((h: number) =>
		h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening")(
		new Date().getHours(),
	);

	if (isLoading) return <LoadingState />;
	if (error || !data)
		return <ErrorState message={error ?? "Dashboard data is unavailable"} onRetry={refetch} />;
	if (data.metrics.length === 0)
		return (
			<EmptyState
				title="No dashboard data"
				description="Dashboard data will populate as your workspace grows."
			/>
		);

	const tasksDueToday = countToday(data.myTasks, "dueDate");
	const eventsToday = countToday(data.upcomingEvents, "startsAt");
	const pendingProposals = data.metrics.find((m) => m.label === "Pending Proposals");
	const pendingCount = pendingProposals ? Number.parseInt(pendingProposals.value, 10) || 0 : 0;

	const contextItems: string[] = [];
	if (tasksDueToday > 0)
		contextItems.push(`${tasksDueToday} ${tasksDueToday === 1 ? "task" : "tasks"} due today`);
	if (eventsToday > 0)
		contextItems.push(`${eventsToday} ${eventsToday === 1 ? "event" : "events"} today`);
	if (pendingCount > 0)
		contextItems.push(
			`${pendingCount} ${pendingCount === 1 ? "proposal" : "proposals"} pending your review`,
		);

	const greetingDescription =
		contextItems.length > 0
			? `Here\u2019s your day: ${contextItems.join("\u00B7 ")}`
			: "Everything looks quiet today.";

	return (
		<Grid style={{ padding: 0 }}>
			<Column lg={16} md={8} sm={4}>
				<PageHeader
					title={`${greeting}, ${user?.displayName ?? "Guest"}`}
					description={
						<div>
							<p>{greetingDescription}</p>
							<p
								style={{
									margin: "0.25rem 0 0",
									fontSize: "0.8125rem",
									color: "var(--cds-text-helper, #6f6f6f)",
									fontStyle: "italic",
								}}
							>
								{dailyQuote()}
							</p>
						</div>
					}
					actions={
						<Stack gap={3} orientation="horizontal">
							{getQuickActions(portal).map((action) => (
								<Button
									key={action.label}
									as={Link}
									to={action.to}
									kind="tertiary"
									size="sm"
									renderIcon={action.icon}
								>
									{action.label}
								</Button>
							))}
						</Stack>
					}
				/>
			</Column>

			<Column lg={16} md={8} sm={4}>
				<Row>
					{data.metrics.map((metric) => (
						<Column
							lg={3}
							md={4}
							sm={4}
							key={metric.label}
							style={{ marginBottom: "1rem" }}
						>
							<MetricCard metric={metric} portal={portal} />
						</Column>
					))}
				</Row>
			</Column>

			<Column lg={10} md={8} sm={4}>
				<Stack gap={6}>
					{/* Needs Attention */}
					<Card padding="lg">
						<Stack gap={4}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<h2 className="cds--type-heading-02" style={{ margin: 0 }}>
									Needs Attention
								</h2>
								<Link
									to={`/${portal}/tasks`}
									className="cds--type-body-01"
									style={{ fontWeight: 500, color: "var(--cds-link-primary)" }}
								>
									View All
								</Link>
							</div>
							<div>
								{data.attention.map((item) => (
									<div
										key={item.id}
										style={{
											display: "flex",
											flexWrap: "wrap",
											alignItems: "center",
											justifyContent: "space-between",
											gap: "0.75rem",
											padding: "1rem",
											borderLeft: `4px solid ${
												item.tone === "danger"
													? "var(--cds-support-error)"
													: item.tone === "tertiary"
														? "var(--cds-support-warning)"
														: "var(--cds-support-info)"
											}`,
											borderTop: "1px solid var(--cds-border-subtle)",
											borderRight: "1px solid var(--cds-border-subtle)",
											borderBottom: "1px solid var(--cds-border-subtle)",
											marginTop: "0.75rem",
										}}
									>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "1rem",
											}}
										>
											<Tag
												type={
													item.tone === "danger"
														? "red"
														: item.tone === "tertiary"
															? "warm-gray"
															: "blue"
												}
											>
												{item.label}
											</Tag>
											<div>
												<p
													className="cds--type-body-02"
													style={{ fontWeight: 500, margin: 0 }}
												>
													{item.title}
												</p>
												<p
													className="cds--type-body-01"
													style={{
														margin: 0,
														color: "var(--cds-text-secondary)",
													}}
												>
													Owner: {item.owner}
												</p>
											</div>
										</div>
										<div
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.75rem",
												color: "var(--cds-text-secondary)",
											}}
											className="cds--type-body-01"
										>
											{item.dueLabel}
											<ArrowRight size={16} aria-hidden="true" />
										</div>
									</div>
								))}
							</div>
						</Stack>
					</Card>

					{/* My Tasks */}
					<Card padding="lg">
						<Stack gap={4}>
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "space-between",
								}}
							>
								<h2 className="cds--type-heading-02" style={{ margin: 0 }}>
									My Tasks
								</h2>
								<Link
									to={`/${portal}/tasks`}
									className="cds--type-body-01"
									style={{ fontWeight: 500, color: "var(--cds-link-primary)" }}
								>
									View All
								</Link>
							</div>
							<Row>
								{data.myTasks.slice(0, 6).map((task) => (
									<Column
										lg={8}
										md={4}
										sm={4}
										key={task.id}
										style={{ marginBottom: "1rem" }}
									>
										<Tile>
											<Stack gap={3}>
												<div
													style={{
														display: "flex",
														justifyContent: "space-between",
														alignItems: "flex-start",
													}}
												>
													<Tag type="outline">{task.priority}</Tag>
													<input
														type="checkbox"
														className="cds--checkbox"
														style={{ margin: 0 }}
														aria-label={`Complete task: ${task.title}`}
													/>
												</div>
												<div>
													<p
														className="cds--type-body-02"
														style={{ fontWeight: 500, margin: 0 }}
													>
														{task.title}
													</p>
													<p
														className="cds--type-body-01"
														style={{
															margin: "0.5rem 0 0",
															color: "var(--cds-text-secondary)",
														}}
													>
														Due {formatDate(task.dueDate)}
													</p>
												</div>
											</Stack>
										</Tile>
									</Column>
								))}
							</Row>
						</Stack>
					</Card>
				</Stack>
			</Column>

			<Column lg={6} md={8} sm={4}>
				<Stack gap={6}>
					{/* Upcoming Events */}
					<Card padding="lg">
						<Stack gap={4}>
							<h2 className="cds--type-heading-02" style={{ margin: 0 }}>
								Upcoming Events
							</h2>
							<div>
								{data.upcomingEvents.slice(0, 5).map((event) => (
									<div
										key={event.id}
										style={{
											borderLeft: "2px solid var(--cds-interactive)",
											paddingLeft: "1rem",
											marginBottom: "1rem",
											position: "relative",
										}}
									>
										<div
											style={{
												position: "absolute",
												left: "-5px",
												top: "4px",
												width: "8px",
												height: "8px",
												borderRadius: "50%",
												background: "var(--cds-interactive)",
												border: "2px solid var(--cds-layer-01)",
											}}
										/>
										<p
											className="cds--type-label"
											style={{ color: "var(--cds-interactive)", margin: 0 }}
										>
											{formatDate(event.startsAt)}
											{event.endsAt ? ` - ${formatDate(event.endsAt)}` : ""}
										</p>
										<p
											className="cds--type-body-02"
											style={{ fontWeight: 500, margin: "0.25rem 0 0" }}
										>
											{event.title}
										</p>
									</div>
								))}
							</div>
						</Stack>
					</Card>

					{/* Recent Activity */}
					<Card padding="lg">
						<Stack gap={4}>
							<h2 className="cds--type-heading-02" style={{ margin: 0 }}>
								Recent Activity
							</h2>
							<div>
								{data.recentActivity.slice(0, 6).map((activity) => (
									<div
										key={activity.id}
										style={{
											display: "flex",
											gap: "0.75rem",
											marginBottom: "1rem",
										}}
									>
										<div
											style={{
												marginTop: "0.25rem",
												width: "2rem",
												height: "2rem",
												flexShrink: 0,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												background: "var(--cds-layer-hover)",
												fontSize: "0.75rem",
												fontWeight: 600,
												color: "var(--cds-text-secondary)",
												borderRadius: "50%",
											}}
										>
											{activity.actorName
												.split(" ")
												.map((p: string) => p[0])
												.join("")
												.slice(0, 2)}
										</div>
										<div>
											<p
												className="cds--type-body-01"
												style={{ fontWeight: 500, margin: 0 }}
											>
												{activity.actorName} {activity.action}
											</p>
											<p
												className="cds--type-body-01"
												style={{
													margin: 0,
													color: "var(--cds-text-secondary)",
												}}
											>
												{activity.resourceTitle}
											</p>
										</div>
									</div>
								))}
							</div>
						</Stack>
					</Card>

					{/* Top Contributors */}
					{data.stats?.topContributors && data.stats.topContributors.length > 0 && (
						<Card padding="lg">
							<Stack gap={4}>
								<h2 className="cds--type-heading-02" style={{ margin: 0 }}>
									Top Contributors
								</h2>
								<div>
									{data.stats.topContributors.slice(0, 5).map((c, i) => (
										<div
											key={c.id}
											style={{
												display: "flex",
												alignItems: "center",
												gap: "0.75rem",
												padding: "0.5rem 0",
												borderBottom:
													i < 4
														? "1px solid var(--cds-border-subtle)"
														: undefined,
											}}
										>
											<span
												style={{
													width: "1.25rem",
													fontWeight: 700,
													fontSize: "0.8125rem",
													color: "var(--cds-text-secondary)",
													textAlign: "center",
												}}
											>
												{i + 1}
											</span>
											<span
												style={{
													width: "2rem",
													height: "2rem",
													borderRadius: "50%",
													background: "var(--cds-button-tertiary)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													color: "#fff",
													fontSize: "0.75rem",
													fontWeight: 600,
													flexShrink: 0,
												}}
											>
												{c.name.charAt(0).toUpperCase()}
											</span>
											<div style={{ flex: 1, minWidth: 0 }}>
												<p
													className="cds--type-body-02"
													style={{ fontWeight: 500, margin: 0 }}
												>
													{c.name}
												</p>
												<p
													className="cds--type-body-01"
													style={{
														margin: 0,
														color: "var(--cds-text-secondary)",
													}}
												>
													{c.role}
												</p>
											</div>
											<div style={{ textAlign: "right" }}>
												<p
													className="cds--type-body-02"
													style={{ fontWeight: 600, margin: 0 }}
												>
													{c.completedTasks}
												</p>
												<p
													className="cds--type-body-01"
													style={{
														margin: 0,
														color: "var(--cds-text-secondary)",
													}}
												>
													tasks
												</p>
											</div>
											<Tag type={c.status === "Active" ? "green" : "gray"}>
												{c.status}
											</Tag>
										</div>
									))}
								</div>
							</Stack>
						</Card>
					)}
				</Stack>
			</Column>
		</Grid>
	);
}
