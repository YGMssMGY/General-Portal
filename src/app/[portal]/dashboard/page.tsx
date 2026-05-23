"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ClipboardList,
  Calendar,
  Users,
  FileText,
  ArrowRight,
  Activity,
} from "lucide-react";
import { useRouter } from "next/navigation";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface DashboardData {
  tasks: Record<string, number>;
  upcomingEvents: Array<{
    id: string;
    title: string;
    startDate: string;
    endDate: string | null;
    location: string | null;
  }>;
  pendingProposals: number;
  unreadNotifications: number;
  totalMembers: number;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown>;
    createdAt: string;
    user: { id: string; name: string | null; image: string | null } | null;
  }>;
}

const statCards = [
  { key: "totalTasks", label: "Total Tasks", icon: ClipboardList, color: "var(--color-primary)" },
  { key: "upcomingEvents", label: "Upcoming Events", icon: Calendar, color: "var(--color-success)" },
  { key: "totalMembers", label: "Members", icon: Users, color: "var(--color-text)" },
  { key: "pendingProposals", label: "Pending Proposals", icon: FileText, color: "var(--color-warning)" },
];

const quickLinks = [
  { label: "View Tasks", path: "/tasks" },
  { label: "Browse Events", path: "/events" },
  { label: "Submit Proposal", path: "/proposals" },
  { label: "Check Messages", path: "/messages" },
];

function getEntityLabel(entityType: string): string {
  const map: Record<string, string> = {
    proposal: "proposal",
    task: "task",
    event: "event",
    message_thread: "message",
    transaction: "transaction",
  };
  return map[entityType] ?? entityType;
}

export default function DashboardPage() {
  const router = useRouter();
  const portal = getPortal();

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: [portal, "dashboard"],
    queryFn: () => fetchJson<DashboardData>(`/api/dashboard`),
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Overview of your portal activity
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent style={{ padding: "20px" }}>
                <Skeleton style={{ width: "32px", height: "32px", borderRadius: "5px", marginBottom: "12px" }} />
                <Skeleton style={{ width: "60px", height: "24px", borderRadius: "5px", marginBottom: "4px" }} />
                <Skeleton style={{ width: "100px", height: "14px", borderRadius: "5px" }} />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <Skeleton style={{ width: "140px", height: "18px", borderRadius: "5px", marginBottom: "16px" }} />
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <Skeleton style={{ width: "24px", height: "24px", borderRadius: "5px", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton style={{ width: "80%", height: "14px", borderRadius: "5px", marginBottom: "4px" }} />
                    <Skeleton style={{ width: "40%", height: "12px", borderRadius: "5px" }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent style={{ padding: "20px" }}>
              <Skeleton style={{ width: "100px", height: "18px", borderRadius: "5px", marginBottom: "16px" }} />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} style={{ width: "100%", height: "36px", borderRadius: "5px", marginBottom: "8px" }} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
          Failed to load dashboard data. Please try again.
        </p>
        <Button
          variant="outline"
          style={{ marginTop: "16px" }}
          onClick={() => router.refresh()}
        >
          Retry
        </Button>
      </div>
    );
  }

  const totalTasks =
    (data.tasks?.todo ?? 0) + (data.tasks?.in_progress ?? 0) + (data.tasks?.done ?? 0);
  const statValues: Record<string, string | number> = {
    totalTasks,
    upcomingEvents: data.upcomingEvents?.length ?? 0,
    totalMembers: data.totalMembers,
    pendingProposals: data.pendingProposals,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
          Overview of your portal activity
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key}>
              <CardContent style={{ padding: "20px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "5px",
                    backgroundColor: "var(--color-bg-secondary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "12px",
                  }}
                >
                  <Icon size={20} style={{ color: stat.color }} />
                </div>
                <p
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "var(--color-text)",
                    margin: 0,
                    lineHeight: 1.2,
                  }}
                >
                  {statValues[stat.key]}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    margin: "4px 0 0",
                  }}
                >
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent style={{ padding: "20px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-text)",
                margin: "0 0 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Activity size={16} />
              Recent Activity
            </h3>
            {data.recentActivity.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "24px 0", textAlign: "center" }}>
                No recent activity
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {data.recentActivity.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      gap: "12px",
                      padding: "10px 0",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "5px",
                        backgroundColor: "var(--color-bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {item.user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", color: "var(--color-text)", margin: 0 }}>
                        <strong>{item.user?.name ?? "Someone"}</strong>{" "}
                        {item.action} a {getEntityLabel(item.entityType)}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                        {format(new Date(item.createdAt), "MMM d, HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent style={{ padding: "20px" }}>
            <h3
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-text)",
                margin: "0 0 16px",
              }}
            >
              Quick Links
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {quickLinks.map((link) => (
                <Button
                  key={link.path}
                  variant="outline"
                  style={{
                    justifyContent: "space-between",
                    width: "100%",
                    height: "44px",
                    padding: "0 16px",
                  }}
                  onClick={() => router.push(`/${portal}${link.path}`)}
                >
                  <span style={{ fontSize: "14px" }}>{link.label}</span>
                  <ArrowRight size={16} />
                </Button>
              ))}
            </div>

            {data.upcomingEvents.length > 0 && (
              <>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--color-text)",
                    margin: "24px 0 16px",
                  }}
                >
                  Upcoming Events
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {data.upcomingEvents.map((event) => (
                    <div
                      key={event.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "10px 12px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          minWidth: "44px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "var(--color-primary)",
                            textTransform: "uppercase",
                          }}
                        >
                          {format(new Date(event.startDate), "MMM")}
                        </span>
                        <span
                          style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            color: "var(--color-text)",
                            lineHeight: 1.2,
                          }}
                        >
                          {format(new Date(event.startDate), "d")}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                          {event.title}
                        </p>
                        {event.location && (
                          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "2px 0 0" }}>
                            {event.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {data.unreadNotifications > 0 && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "10px 12px",
                  borderRadius: "5px",
                  backgroundColor: "var(--color-primary-light)",
                  border: "1px solid var(--color-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "5px",
                    backgroundColor: "var(--color-primary)",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-primary)" }}>
                  {data.unreadNotifications} unread notification{data.unreadNotifications !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
