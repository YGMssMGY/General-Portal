import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Grid, Column, Row, Tile, Stack, Tag, ProgressBar, Button } from "@carbon/react";
import {
    Task,
    Warning,
    Calendar,
    User,
    ArrowUp,
    ArrowDown,
    Activity as ActivityIcon,
    Document,
    Edit,
    Add,
} from "@carbon/icons-react";
import { SimpleBarChart } from "@carbon/charts-react";
import "@carbon/charts/styles.css";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState, EmptyState } from "../../components/StateViews";
import { useActivity, useActivityStats } from "../../hooks/useWorkspaceResources";
import { useUIStore } from "../../stores/useUIStore";
import { formatDateTime } from "../../utils/format";

const activityTypeIcon: Record<string, typeof Document> = {
    task: Task,
    proposal: Document,
    event: Calendar,
    file: Document,
    finance: Document,
    message: Edit,
    member: User,
};

const activityTypeColor: Record<string, string> = {
    task: "#0f62fe",
    proposal: "#8a3ffc",
    event: "#007d79",
    file: "#198038",
    finance: "#ff832b",
    message: "#6f6f6f",
    member: "#a56eff",
};

function getActivityMeta(type: string) {
    const key = type.toLowerCase();
    const Icon = activityTypeIcon[key] ?? ActivityIcon;
    return {
        Icon,
        color: activityTypeColor[key] ?? "var(--cds-text-secondary)",
    };
}

export function ActivityPage() {
    const portal = useUIStore((s) => s.portal) || "developers";
    const navigate = useNavigate();
    const {
        data: activity,
        error: activityError,
        isLoading: activityLoading,
        refetch,
    } = useActivity();
    const { data: stats, error: statsError, isLoading: statsLoading } = useActivityStats();

    const isLoading = activityLoading || statsLoading;
    const error = activityError || statsError;

    const contributorColumns: ColumnDef<any>[] = useMemo(
        () => [
            {
                key: "name",
                header: "Name",
                sortable: true,
                render: (row: any) => <span style={{ fontWeight: 500 }}>{row.name}</span>,
            },
            { key: "role", header: "Role", sortable: true },
            { key: "completedTasks", header: "Completed Tasks", sortable: true },
            { key: "lastActive", header: "Last Active", sortable: true },
            {
                key: "status",
                header: "Status",
                sortable: true,
                render: (row: any) => (
                    <Tag type={row.status === "Active" ? "green" : "cool-gray"}>
                        {row.status === "Active" ? "● Active" : "○ Offline"}
                    </Tag>
                ),
            },
        ],
        [],
    );

    const chartData = useMemo(() => {
        const trend = stats?.taskCompletionTrend ?? [];
        return trend.map((d) => {
            const date = new Date(d.date);
            const label = date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
            });
            return { group: "Tasks Completed", key: label, value: d.count };
        });
    }, [stats]);

    const chartOptions = {
        title: "Task Completion Trend (Last 7 Days)",
        axes: {
            bottom: { mapsTo: "key", title: "Date" },
            left: { mapsTo: "value", title: "Tasks Completed" },
        },
        height: "220px",
        toolbar: { enabled: false },
    };

    if (isLoading) return <LoadingState />;
    if (error || !activity)
        return <ErrorState message={error ?? "Activity data unavailable"} onRetry={refetch} />;
    if (activity.length === 0)
        return (
            <EmptyState
                title="No activity"
                description="Activity will appear here once members start contributing."
                action={
                    <Button
                        type="button"
                        renderIcon={Add}
                        onClick={() => navigate(`/${portal}/tasks`)}
                    >
                        Create Task
                    </Button>
                }
            />
        );

    return (
        <div>
            <Link
                to={`/${portal}/dashboard`}
                style={{
                    fontSize: "0.8125rem",
                    color: "var(--cds-link-primary)",
                    textDecoration: "none",
                    display: "inline-block",
                    marginBottom: "0.5rem",
                }}
            >
                &larr; Back to Dashboard
            </Link>
            <Grid style={{ padding: 0 }}>
                <Column lg={16} md={8} sm={4}>
                    <PageHeader
                        title="Activity"
                        description="Track contributions, progress, and workspace changes."
                    />
                </Column>

                {/* 3 Summary Cards */}
                <Column lg={16} md={8} sm={4}>
                    <Row>
                        <Column lg={5} md={4} sm={4} style={{ marginBottom: "0.75rem" }}>
                            <Tile style={{ padding: "1rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <div>
                                        <p
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.025em",
                                                color: "var(--cds-text-secondary)",
                                                marginBottom: "0.5rem",
                                            }}
                                        >
                                            Tasks Completed
                                        </p>
                                        <p
                                            style={{
                                                fontSize: "2rem",
                                                fontWeight: 600,
                                                color: "var(--cds-text-primary)",
                                                lineHeight: 1,
                                            }}
                                        >
                                            {stats?.tasksCompleted ?? 0}
                                        </p>
                                        {stats?.tasksCompletedTrend != null ? (
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "0.25rem",
                                                    marginTop: "0.5rem",
                                                }}
                                            >
                                                {stats.tasksCompletedTrend >= 0 ? (
                                                    <ArrowUp
                                                        size={16}
                                                        style={{
                                                            color: "var(--cds-support-success)",
                                                        }}
                                                    />
                                                ) : (
                                                    <ArrowDown
                                                        size={16}
                                                        style={{
                                                            color: "var(--cds-support-error)",
                                                        }}
                                                    />
                                                )}
                                                <span
                                                    style={{
                                                        fontSize: "0.875rem",
                                                        fontWeight: 500,
                                                        color:
                                                            stats.tasksCompletedTrend >= 0
                                                                ? "var(--cds-support-success)"
                                                                : "var(--cds-support-error)",
                                                    }}
                                                >
                                                    {Math.abs(stats.tasksCompletedTrend)}% vs last
                                                    week
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                    <Task
                                        size={24}
                                        style={{ color: "#0f62fe" }}
                                        aria-hidden="true"
                                    />
                                </div>
                            </Tile>
                        </Column>
                        <Column lg={5} md={4} sm={4} style={{ marginBottom: "0.75rem" }}>
                            <Tile style={{ padding: "1rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <div>
                                        <p
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.025em",
                                                color: "var(--cds-text-secondary)",
                                                marginBottom: "0.5rem",
                                            }}
                                        >
                                            Overdue Tasks
                                        </p>
                                        <p
                                            style={{
                                                fontSize: "2rem",
                                                fontWeight: 600,
                                                color: "var(--cds-support-error)",
                                                lineHeight: 1,
                                            }}
                                        >
                                            {stats?.overdueTasks ?? 0}
                                        </p>
                                    </div>
                                    <Warning
                                        size={24}
                                        style={{ color: "#da1e28" }}
                                        aria-hidden="true"
                                    />
                                </div>
                            </Tile>
                        </Column>
                        <Column lg={6} md={4} sm={4} style={{ marginBottom: "0.75rem" }}>
                            <Tile style={{ padding: "1rem" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <div>
                                        <p
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 600,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.025em",
                                                color: "var(--cds-text-secondary)",
                                                marginBottom: "0.5rem",
                                            }}
                                        >
                                            Volunteer Hours
                                        </p>
                                        <p
                                            style={{
                                                fontSize: "2rem",
                                                fontWeight: 600,
                                                color: "var(--cds-text-primary)",
                                                lineHeight: 1,
                                            }}
                                        >
                                            {stats?.volunteerHours ?? 0}
                                        </p>
                                    </div>
                                    <Calendar
                                        size={24}
                                        style={{ color: "#007d79" }}
                                        aria-hidden="true"
                                    />
                                </div>
                            </Tile>
                        </Column>
                    </Row>
                </Column>

                {/* Bar Chart + Progress Bars */}
                <Column lg={10} md={8} sm={4} style={{ marginBottom: "1rem" }}>
                    <Card padding="md">
                        <h2
                            style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                marginBottom: "0.75rem",
                                color: "var(--cds-text-primary)",
                            }}
                        >
                            Task Completion Trend (Last 7 Days)
                        </h2>
                        {chartData.length > 0 ? (
                            <SimpleBarChart data={chartData} options={chartOptions} />
                        ) : (
                            <div
                                style={{
                                    height: "220px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "var(--cds-text-secondary)",
                                    fontSize: "0.875rem",
                                }}
                            >
                                No completion data available yet.
                            </div>
                        )}
                    </Card>
                </Column>

                <Column lg={6} md={8} sm={4} style={{ marginBottom: "1rem" }}>
                    <Card padding="md">
                        <h2
                            style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                marginBottom: "0.75rem",
                                color: "var(--cds-text-primary)",
                            }}
                        >
                            Open Tasks by Status
                        </h2>
                        <Stack gap={5}>
                            {(stats?.openTasksByStatus ?? []).length > 0 ? (
                                stats!.openTasksByStatus.map((item) => (
                                    <div key={item.status}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                marginBottom: "0.375rem",
                                            }}
                                        >
                                            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                                                {item.status}
                                            </span>
                                            <span
                                                style={{
                                                    fontSize: "0.875rem",
                                                    fontWeight: 600,
                                                    color: "var(--cds-text-primary)",
                                                }}
                                            >
                                                {item.count} ({item.percent}%)
                                            </span>
                                        </div>
                                        <ProgressBar
                                            value={item.percent}
                                            max={100}
                                            label=""
                                            aria-label={`${item.status}: ${item.percent}%`}
                                        />
                                    </div>
                                ))
                            ) : (
                                <p
                                    style={{
                                        fontSize: "0.875rem",
                                        color: "var(--cds-text-secondary)",
                                    }}
                                >
                                    No open tasks.
                                </p>
                            )}
                        </Stack>
                    </Card>
                </Column>

                {/* Top Contributors */}
                <Column lg={16} md={8} sm={4} style={{ marginBottom: "1rem" }}>
                    <Card padding="md">
                        <h2
                            style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                marginBottom: "0.75rem",
                                color: "var(--cds-text-primary)",
                            }}
                        >
                            Top Contributors
                        </h2>
                        {(stats?.topContributors ?? []).length > 0 ? (
                            <DataTable
                                columns={contributorColumns}
                                data={
                                    stats!.topContributors as unknown as Record<string, unknown>[]
                                }
                                defaultSort={{ key: "completedTasks", direction: "desc" }}
                                pageSize={5}
                            />
                        ) : (
                            <p
                                style={{
                                    fontSize: "0.875rem",
                                    color: "var(--cds-text-secondary)",
                                    padding: "1rem 0",
                                }}
                            >
                                No contributor data available yet.
                            </p>
                        )}
                    </Card>
                </Column>

                {/* Activity Feed */}
                <Column lg={16} md={8} sm={4} style={{ marginBottom: "1rem" }}>
                    <Card padding="md">
                        <h2
                            style={{
                                fontSize: "1rem",
                                fontWeight: 600,
                                marginBottom: "0.75rem",
                                color: "var(--cds-text-primary)",
                            }}
                        >
                            Activity Feed
                        </h2>
                        <div>
                            {activity.map((item, i) => {
                                const { Icon, color } = getActivityMeta(item.resourceType);
                                return (
                                    <div
                                        key={item.id}
                                        style={{
                                            display: "flex",
                                            gap: "0.75rem",
                                            padding: "0.75rem 0",
                                            borderBottom:
                                                i < activity.length - 1
                                                    ? "1px solid var(--cds-border-subtle)"
                                                    : "none",
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "2rem",
                                                height: "2rem",
                                                flexShrink: 0,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                background: `${color}18`,
                                                borderRadius: "50%",
                                            }}
                                        >
                                            <Icon size={16} style={{ color }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    gap: "0.375rem",
                                                    alignItems: "baseline",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        fontWeight: 500,
                                                        fontSize: "0.875rem",
                                                        color: "var(--cds-text-primary)",
                                                    }}
                                                >
                                                    {item.actorName}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: "0.875rem",
                                                        color: "var(--cds-text-secondary)",
                                                    }}
                                                >
                                                    {item.action}
                                                </span>
                                                <Tag
                                                    type="outline"
                                                    style={{ fontSize: "0.6875rem" }}
                                                >
                                                    {item.resourceType}
                                                </Tag>
                                            </div>
                                            <p
                                                style={{
                                                    marginTop: "0.125rem",
                                                    fontSize: "0.875rem",
                                                    fontWeight: 500,
                                                    color: "var(--cds-text-primary)",
                                                }}
                                            >
                                                {item.resourceTitle}
                                            </p>
                                            <p
                                                style={{
                                                    marginTop: "0.125rem",
                                                    fontSize: "0.75rem",
                                                    color: "var(--cds-text-secondary)",
                                                }}
                                            >
                                                {formatDateTime(item.occurredAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </Column>
            </Grid>
        </div>
    );
}
