import { Link } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useAuth } from "../../context/AuthContext";
import { useDashboard } from "../../hooks/useWorkspaceResources";
import { priorityBadgeClass } from "../../utils/classes";
import { formatDate } from "../../utils/format";
import { ArrowRight, Task, Document, Calendar, Warning } from "@carbon/icons-react";
import type { DashboardMetric } from "../../types";
import type { ComponentType } from "react";

const metricIcons: Record<string, ComponentType<any>> = {
  Task,
  Document,
  Calendar,
  Warning,
};

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metricIcons[metric.icon] ?? Task;
  const colorMap: Record<string, string> = {
    primary: "text-carbon-blue-60",
    secondary: "text-carbon-teal-60",
    tertiary: "text-carbon-green-60",
    danger: "text-carbon-red-60",
    neutral: "text-text-secondary",
  };

  return (
    <Card padding="lg" className="flex flex-col justify-between">
      <Icon size={24} className={colorMap[metric.tone]} aria-hidden="true" />
      <div>
        <p className="text-2xl font-semibold text-text-primary">{metric.value}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{metric.label}</p>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useDashboard();

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Dashboard data is unavailable"} onRetry={refetch} />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary font-condensed">
          Good morning, {(user?.name ?? "").split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Here is what is happening in your workspace today.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
        <div className="space-y-6">
          <Card padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary font-condensed">Needs Attention</h2>
              <Link to="/admin/tasks" className="text-sm font-medium text-carbon-blue-60 hover:text-carbon-blue-70 transition-colors">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {data.attention.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 border border-border-subtle p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <Badge
                      className={
                        item.tone === "danger"
                          ? "border-carbon-red-30 bg-carbon-red-10 text-carbon-red-60"
                          : item.tone === "tertiary"
                          ? "border-carbon-yellow-30 bg-carbon-yellow-10 text-carbon-yellow-50"
                          : "border-carbon-blue-30 bg-carbon-blue-10 text-carbon-blue-60"
                      }
                    >
                      {item.label}
                    </Badge>
                    <div>
                      <p className="font-medium text-text-primary">{item.title}</p>
                      <p className="text-sm text-text-secondary">Owner: {item.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-text-secondary">
                    {item.dueLabel}
                    <ArrowRight size={16} aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary font-condensed">My Tasks</h2>
              <Link to="/admin/tasks" className="text-sm font-medium text-carbon-blue-60 hover:text-carbon-blue-70 transition-colors">
                View All
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {data.myTasks.map((task) => (
                <div key={task.id} className="border border-border-subtle p-4">
                  <Badge className={priorityBadgeClass(task.priority)}>{task.priority}</Badge>
                  <p className="mt-3 font-medium text-text-primary">{task.title}</p>
                  <p className="mt-2 text-sm text-text-secondary">Due {formatDate(task.dueDate)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-text-primary font-condensed">Upcoming Events</h2>
            <div className="space-y-4">
              {data.upcomingEvents.map((event) => (
                <div key={event.id} className="border-l-2 border-carbon-blue-60 pl-4">
                  <p className="text-sm font-semibold text-carbon-blue-60">
                    {formatDate(event.startsAt)}
                    {event.endsAt ? ` - ${formatDate(event.endsAt)}` : ""}
                  </p>
                  <p className="mt-1 font-medium text-text-primary">{event.title}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="mb-4 text-lg font-semibold text-text-primary font-condensed">Recent Activity</h2>
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="mt-1 h-8 w-8 shrink-0 flex items-center justify-center bg-surface-hover text-xs font-semibold text-text-secondary">
                    {activity.actorName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {activity.actorName} {activity.action}
                    </p>
                    <p className="text-sm text-text-secondary">{activity.resourceTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
