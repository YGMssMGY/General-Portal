import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  MessageSquare,
  WalletCards
} from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useAuth } from "../../context/AuthContext";
import { useDashboard } from "../../hooks/useWorkspaceResources";
import { priorityBadgeClass } from "../../utils/classes";
import { formatDate } from "../../utils/format";

const metricIcons = {
  proposal: FileText,
  task: CheckCircle2,
  warning: AlertTriangle,
  message: MessageSquare,
  finance: WalletCards
};

const metricToneClass = {
  primary: "text-primary bg-primary/10",
  secondary: "text-secondary bg-secondary-fixed",
  tertiary: "text-tertiary bg-tertiary-fixed",
  danger: "text-error bg-error-container",
  neutral: "text-on-surface-variant bg-surface-container-high"
};

const attentionToneClass = {
  danger: "bg-error-container text-on-error-container",
  tertiary: "bg-tertiary-fixed text-tertiary",
  primary: "bg-primary-fixed text-primary"
};

export function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch } = useDashboard();

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Dashboard data is unavailable"} onRetry={refetch} />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold text-on-surface">Good morning, {user?.name.split(" ")[0]}</h1>
        <p className="mt-1 text-sm leading-6 text-on-surface-variant">
          Here is what is happening in your workspace today.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {data.metrics.map((metric) => {
          const Icon = metricIcons[metric.icon as keyof typeof metricIcons] ?? ClipboardList;
          return (
            <Card key={metric.label} className="flex h-32 flex-col justify-between p-card-padding">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metricToneClass[metric.tone]}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="font-display text-2xl font-semibold text-on-surface">{metric.value}</div>
                <div className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">{metric.label}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <Card className="p-card-padding">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-on-surface">Needs Attention</h2>
              <Link to="/tasks" className="text-sm font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {data.attention.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-lg border border-outline-variant p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <Badge className={attentionToneClass[item.tone]}>{item.label}</Badge>
                    <div>
                      <p className="font-medium text-on-surface">{item.title}</p>
                      <p className="text-sm text-on-surface-variant">Owner: {item.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-on-surface-variant">
                    {item.dueLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-card-padding">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-on-surface">My Tasks</h2>
              <Link to="/tasks" className="text-sm font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {data.myTasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-outline-variant p-4">
                  <Badge className={priorityBadgeClass(task.priority)}>{task.priority}</Badge>
                  <p className="mt-4 font-medium text-on-surface">{task.title}</p>
                  <p className="mt-3 text-sm text-on-surface-variant">Due {formatDate(task.dueDate)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-card-padding">
            <h2 className="mb-5 font-display text-lg font-semibold text-on-surface">Upcoming Events</h2>
            <div className="space-y-5">
              {data.upcomingEvents.map((event) => (
                <div key={event.id} className="border-l-2 border-outline-variant pl-4">
                  <p className="text-sm font-semibold text-primary">
                    {formatDate(event.startsAt)}
                    {event.endsAt ? ` - ${formatDate(event.endsAt)}` : ""}
                  </p>
                  <p className="mt-2 font-medium text-on-surface">{event.title}</p>
                  <p className="text-sm text-on-surface-variant">{event.status === "active" ? "School-wide coordination." : "Planning phase."}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-card-padding">
            <h2 className="mb-5 font-display text-lg font-semibold text-on-surface">Recent Activity</h2>
            <div className="space-y-4">
              {data.recentActivity.map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="mt-1 h-8 w-8 rounded-full bg-surface-container-high" />
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {activity.actorName} {activity.action}
                    </p>
                    <p className="text-sm text-on-surface-variant">{activity.resourceTitle}</p>
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
