import { Link } from "react-router-dom";
import { Tile, Tag, Button, ClickableTile } from "@carbon/react";
import { Card } from "../../components/Card";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useAuth } from "../../context/AuthContext";
import { useDashboard } from "../../hooks/useWorkspaceResources";
import { formatDate } from "../../utils/format";
import {
  ArrowRight,
  Task,
  Document,
  Calendar,
  Warning,
  Add,
  Chat,
  Event,
} from "@carbon/icons-react";
import type { DashboardMetric } from "../../types";
import type { ComponentType } from "react";

const metricIcons: Record<string, ComponentType<any>> = {
  Task,
  Document,
  Calendar,
  Warning,
};

const metricLinks: Record<string, string> = {
  "Open Tasks": "/admin/tasks",
  "Pending Proposals": "/admin/proposals",
  "Upcoming Events": "/admin/events",
  "Unread Messages": "/admin/messages",
};

const colorMap: Record<string, string> = {
  primary: "#0f62fe",
  secondary: "#007d79",
  tertiary: "#198038",
  danger: "#da1e28",
  neutral: "var(--cds-text-secondary)",
};

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.icon] ?? Task;
  const link = metricLinks[metric.label];

  if (link) {
    return (
      <ClickableTile
        href={link}
        style={{
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: "120px",
        }}
      >
        <Icon size={24} style={{ color: colorMap[metric.tone] }} aria-hidden="true" />
        <div>
          <p style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            {metric.value}
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.025em",
              color: "var(--cds-text-secondary)",
            }}
          >
            {metric.label}
          </p>
        </div>
      </ClickableTile>
    );
  }

  return (
    <Card padding="lg" className="flex flex-col justify-between">
      <Icon size={24} style={{ color: colorMap[metric.tone] }} aria-hidden="true" />
      <div>
        <p style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
          {metric.value}
        </p>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.025em",
            color: "var(--cds-text-secondary)",
          }}
        >
          {metric.label}
        </p>
      </div>
    </Card>
  );
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

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Dashboard data is unavailable"} onRetry={refetch} />;

  return (
    <div>
      <div
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            Good morning, {(user?.displayName ?? "").split(" ")[0]}
          </h1>
          <p
            style={{
              marginTop: "0.25rem",
              fontSize: "0.875rem",
              color: "var(--cds-text-secondary)",
            }}
          >
            Here is what is happening in your workspace today.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {data.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
        }}
        className="dashboard-main-grid"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Card padding="lg">
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}
              >
                Needs Attention
              </h2>
              <Link
                to="/admin/tasks"
                style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--cds-link-primary)" }}
              >
                View All
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
                    border: "1px solid var(--cds-border-subtle)",
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
                      <p style={{ fontWeight: 500, color: "var(--cds-text-primary)" }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                        Owner: {item.owner}
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      fontSize: "0.875rem",
                      color: "var(--cds-text-secondary)",
                    }}
                  >
                    {item.dueLabel}
                    <ArrowRight size={16} aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}
              >
                My Tasks
              </h2>
              <Link
                to="/admin/tasks"
                style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--cds-link-primary)" }}
              >
                View All
              </Link>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1rem",
              }}
            >
              {data.myTasks.slice(0, 6).map((task) => (
                <div
                  key={task.id}
                  style={{ padding: "1rem", border: "1px solid var(--cds-border-subtle)" }}
                >
                  <Tag type="outline">{task.priority}</Tag>
                  <p
                    style={{
                      marginTop: "0.75rem",
                      fontWeight: 500,
                      color: "var(--cds-text-primary)",
                    }}
                  >
                    {task.title}
                  </p>
                  <p
                    style={{
                      marginTop: "0.5rem",
                      fontSize: "0.875rem",
                      color: "var(--cds-text-secondary)",
                    }}
                  >
                    Due {formatDate(task.dueDate)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Card padding="lg">
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "var(--cds-text-primary)",
                }}
              >
                Upcoming Events
              </h2>
              <Link
                to="/admin/events"
                style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--cds-link-primary)" }}
              >
                View All
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {data.upcomingEvents.slice(0, 5).map((event) => (
                <div
                  key={event.id}
                  style={{ borderLeft: "2px solid #0f62fe", paddingLeft: "1rem" }}
                >
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0f62fe" }}>
                    {formatDate(event.startsAt)}
                    {event.endsAt ? ` - ${formatDate(event.endsAt)}` : ""}
                  </p>
                  <p
                    style={{
                      marginTop: "0.25rem",
                      fontWeight: 500,
                      color: "var(--cds-text-primary)",
                    }}
                  >
                    {event.title}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <h2
              style={{
                marginBottom: "1rem",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "var(--cds-text-primary)",
              }}
            >
              Recent Activity
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {data.recentActivity.slice(0, 6).map((activity) => (
                <div key={activity.id} style={{ display: "flex", gap: "0.75rem" }}>
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
                    }}
                  >
                    {activity.actorName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 500,
                        color: "var(--cds-text-primary)",
                      }}
                    >
                      {activity.actorName} {activity.action}
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                      {activity.resourceTitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .dashboard-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
