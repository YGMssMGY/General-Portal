import { Link } from "react-router-dom";
import { Tag, Button, ClickableTile, Tile, Grid, Column, Row, Stack } from "@carbon/react";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useAuth } from "../../context/AuthContext";
import { useDashboard } from "../../hooks/useWorkspaceResources";
import { formatDate } from "../../utils/format";
import { ArrowRight, Task, Document, Calendar, Warning, Chat, Event } from "@carbon/icons-react";
import type { DashboardMetric } from "../../types";
import type { ComponentType } from "react";

const metricIcons: Record<string, ComponentType<any>> = {
  Task,
  Document,
  Calendar,
  Warning,
  Forum: Chat,
  Payment: Calendar,
};

const metricLinks: Record<string, string> = {
  "Open Tasks": "/admin/tasks",
  "Pending Proposals": "/admin/proposals",
  "Upcoming Events": "/admin/events",
  "Unread Messages": "/admin/messages",
};

const toneIconColors: Record<string, string> = {
  primary: "var(--cds-support-info)",
  secondary: "var(--cds-support-success)",
  tertiary: "var(--cds-support-success)",
  danger: "var(--cds-support-error)",
  neutral: "var(--cds-text-secondary)",
};

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.icon] ?? Task;
  const link = metricLinks[metric.label];
  const iconColor = toneIconColors[metric.tone];

  const inner = (
    <Stack gap={4}>
      <Icon size={24} style={{ color: iconColor }} aria-hidden="true" />
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
    </Stack>
  );

  if (link) {
    return <ClickableTile href={link}>{inner}</ClickableTile>;
  }

  return <Tile>{inner}</Tile>;
}

const quickActions = [
  { label: "New Task", icon: Task, to: "/admin/tasks" },
  { label: "New Proposal", icon: Document, to: "/admin/proposals" },
  { label: "New Event", icon: Event, to: "/admin/events" },
  { label: "Send Message", icon: Chat, to: "/admin/messages" },
];

export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useDashboard();
  const greeting = ((h: number) =>
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening")(new Date().getHours());

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Dashboard data is unavailable"} onRetry={refetch} />;

  return (
    <Grid style={{ padding: 0 }}>
      <Column lg={16} md={8} sm={4}>
        <PageHeader
          title={`${greeting}, ${(user?.displayName ?? "").split(" ")[0]}`}
          description="Here is what is happening in your workspace today."
          actions={
            <Stack gap={3} orientation="horizontal">
              {quickActions.map((action) => (
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
            <Column lg={3} md={4} sm={4} key={metric.label} style={{ marginBottom: "1rem" }}>
              <MetricCard metric={metric} />
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
                  to="/admin/tasks"
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
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
                        <p className="cds--type-body-02" style={{ fontWeight: 500, margin: 0 }}>
                          {item.title}
                        </p>
                        <p
                          className="cds--type-body-01"
                          style={{ margin: 0, color: "var(--cds-text-secondary)" }}
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
                  to="/admin/tasks"
                  className="cds--type-body-01"
                  style={{ fontWeight: 500, color: "var(--cds-link-primary)" }}
                >
                  View All
                </Link>
              </div>
              <Row>
                {data.myTasks.slice(0, 6).map((task) => (
                  <Column lg={8} md={4} sm={4} key={task.id} style={{ marginBottom: "1rem" }}>
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
                          <p className="cds--type-body-02" style={{ fontWeight: 500, margin: 0 }}>
                            {task.title}
                          </p>
                          <p
                            className="cds--type-body-01"
                            style={{ margin: "0.5rem 0 0", color: "var(--cds-text-secondary)" }}
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
                    style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}
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
                      <p className="cds--type-body-01" style={{ fontWeight: 500, margin: 0 }}>
                        {activity.actorName} {activity.action}
                      </p>
                      <p
                        className="cds--type-body-01"
                        style={{ margin: 0, color: "var(--cds-text-secondary)" }}
                      >
                        {activity.resourceTitle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Stack>
          </Card>
        </Stack>
      </Column>
    </Grid>
  );
}
