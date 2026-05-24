"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import CalendarView, { type CalendarItem } from "@/components/calendar-view";
import { format } from "date-fns";
import {
  Calendar,
  Plus,
  ChevronDown,
  ChevronUp,
  MapPin,
  List,
  Grid3X3,
  Trash2,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  location: string | null;
  isPublic: boolean;
  status: "draft" | "published" | "cancelled";
  approvalStatus?: "pending" | "approved" | "rejected" | null;
  planId?: string | null;
  planName?: string | null;
  createdBy: { id: string; name: string | null; email: string; image: string | null };
  createdAt: string;
}

interface AnnualPlan {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
}

interface CalendarResponse {
  events: CalendarItem[];
}

const eventStatusConfig: Record<string, { label: string; variant: "outline" | "default" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  published: { label: "Published", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const approvalStatusConfig: Record<string, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function EventsPage() {
  const portal = usePortal();
  usePageTitle("Events | General Portal");
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [activeTab, setActiveTab] = useState("events");

  const { data, isLoading, isError } = useQuery<EventData[]>({
    queryKey: [portal, "events"],
    queryFn: () => fetchJson<EventData[]>(`/api/events`),
  });

  const { data: calendarData } = useQuery<CalendarResponse>({
    queryKey: [portal, "calendar"],
    queryFn: () => fetchJson<CalendarResponse>(`/api/calendar`),
    enabled: activeTab === "events",
  });

  const { data: annualPlans } = useQuery<AnnualPlan[]>({
    queryKey: [portal, "annual-plans"],
    queryFn: () => fetchJson<AnnualPlan[]>(`/api/events/annual-plan`),
    enabled: activeTab === "events",
  });

  const createMutation = useMutation({
    mutationFn: (body: {
      title: string;
      description: string;
      startDate: string;
      endDate: string | null;
      location: string;
      isPublic: boolean;
    }) =>
      fetchJson<EventData>(`/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "events"] });
      queryClient.invalidateQueries({ queryKey: [portal, "calendar"] });
      setShowCreate(false);
      setNewTitle("");
      setNewDescription("");
      setNewStartDate("");
      setNewEndDate("");
      setNewLocation("");
      setNewIsPublic(false);
    },
  });

  const deleteEvent = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/events/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "events"] });
      queryClient.invalidateQueries({ queryKey: [portal, "calendar"] });
    },
  });

  const approveEvent = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/events/${id}/approve`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "events"] });
    },
  });

  const rejectEvent = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/events/${id}/reject`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "events"] });
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Events</h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
              Plan and manage events
            </p>
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent style={{ padding: "20px" }}>
              <div style={{ display: "flex", gap: "16px" }}>
                <Skeleton style={{ width: "48px", height: "48px", borderRadius: "5px", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <Skeleton style={{ width: "50%", height: "16px", borderRadius: "5px", marginBottom: "8px" }} />
                  <Skeleton style={{ width: "30%", height: "14px", borderRadius: "5px" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
          Failed to load events.
        </p>
      </div>
    );
  }

  const events = data ?? [];

  function handleCreate() {
    if (!newTitle.trim() || !newStartDate) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim(),
      startDate: newStartDate,
      endDate: newEndDate || null,
      location: newLocation.trim(),
      isPublic: newIsPublic,
    });
  }

  function handleCalendarItemClick(item: CalendarItem) {
    if (item.type === "event") {
      setExpandedId(item.entityId);
      setActiveTab("events");
      setViewMode("list");
    }
  }

  const monthLabel = (dateStr: string) => format(new Date(dateStr), "MMM");
  const dayLabel = (dateStr: string) => format(new Date(dateStr), "d");
  const timeLabel = (dateStr: string) => format(new Date(dateStr), "h:mm a");

  const calendarItems: CalendarItem[] = (calendarData?.events ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    date: e.date ?? e.startDate,
    type: "event" as const,
    portal,
    entityId: e.id,
  }));

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", margin: 0 }}>Events</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "4px 0 0" }}>
            Plan and manage events
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {activeTab === "events" && (
            <>
              <div
                style={{
                  display: "flex",
                  border: "1px solid var(--color-border)",
                  borderRadius: "5px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    border: "none",
                    backgroundColor: viewMode === "list" ? "var(--color-bg-secondary)" : "transparent",
                    color: viewMode === "list" ? "var(--color-primary)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("calendar")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    border: "none",
                    backgroundColor: viewMode === "calendar" ? "var(--color-bg-secondary)" : "transparent",
                    color: viewMode === "calendar" ? "var(--color-primary)" : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <Grid3X3 size={16} />
                </button>
              </div>
              <Button onClick={() => setShowCreate(true)}>
                <Plus size={16} />
                <span>New Event</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <TabsList>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="plans">Annual Plan</TabsTrigger>
      </TabsList>

      <TabsContent value="events">
        {events.length === 0 ? (
          <Card>
            <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
              <Calendar size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                No events yet
              </p>
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                Create the first event for your organization.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          events.map((event) => {
            const isExpanded = expandedId === event.id;
            const config = eventStatusConfig[event.status] ?? eventStatusConfig.draft;
            const approvalConfig = event.approvalStatus
              ? approvalStatusConfig[event.approvalStatus] ?? null
              : null;

            return (
              <Card key={event.id}>
                <div
                  onClick={() => setExpandedId(isExpanded ? null : event.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "16px",
                    padding: "20px",
                    cursor: "pointer",
                    borderBottom: isExpanded ? "1px solid var(--color-border)" : "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      minWidth: "52px",
                      padding: "8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "5px",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>
                      {monthLabel(event.startDate)}
                    </span>
                    <span style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text)", lineHeight: 1.2 }}>
                      {dayLabel(event.startDate)}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                        {event.title}
                      </h3>
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {approvalConfig && (
                        <Badge variant={approvalConfig.variant as "default" | "secondary" | "destructive" | "outline"}>
                          {approvalConfig.label}
                        </Badge>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
                      <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                        {timeLabel(event.startDate)}
                        {event.endDate ? ` - ${timeLabel(event.endDate)}` : ""}
                      </span>
                      {event.location && (
                        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={12} />
                          {event.location}
                        </span>
                      )}
                      {event.planName && (
                        <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <FileText size={12} />
                          {event.planName}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} style={{ flexShrink: 0, color: "var(--color-text-secondary)" }} /> : <ChevronDown size={18} style={{ flexShrink: 0, color: "var(--color-text-secondary)" }} />}
                </div>

                {isExpanded && (
                  <div style={{ padding: "20px" }}>
                    {event.description && (
                      <p style={{ fontSize: "14px", color: "var(--color-text)", margin: "0 0 16px", whiteSpace: "pre-wrap" }}>
                        {event.description}
                      </p>
                    )}
                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        flexWrap: "wrap",
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: "var(--color-text)" }}>Start: </span>
                        {format(new Date(event.startDate), "MMM d, yyyy h:mm a")}
                      </div>
                      {event.endDate && (
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>End: </span>
                          {format(new Date(event.endDate), "MMM d, yyyy h:mm a")}
                        </div>
                      )}
                      {event.location && (
                        <div>
                          <span style={{ fontWeight: 600, color: "var(--color-text)" }}>Location: </span>
                          {event.location}
                        </div>
                      )}
                    </div>
                    {isAdmin && (
                      <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {event.approvalStatus === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); approveEvent.mutate(event.id); }}
                              disabled={approveEvent.isPending}
                            >
                              <CheckCircle size={14} />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); rejectEvent.mutate(event.id); }}
                              disabled={rejectEvent.isPending}
                            >
                              <XCircle size={14} />
                              Reject
                            </Button>
                          </>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); if (confirm("Delete this event?")) deleteEvent.mutate(event.id); }}
                          style={{ display:"flex", alignItems:"center", gap:"6px", padding:"8px 12px", border:"1px solid var(--color-destructive)", borderRadius:"5px", background:"var(--color-bg)", cursor:"pointer", fontSize:"13px", fontFamily:"inherit", color:"var(--color-destructive)" }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {events.map((event) => {
              const config = eventStatusConfig[event.status] ?? eventStatusConfig.draft;
              return (
                <Card key={event.id}>
                  <div
                    style={{
                      padding: "12px",
                      borderBottom: "1px solid var(--color-border)",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-primary)", textTransform: "uppercase" }}>
                      {monthLabel(event.startDate)}
                    </span>
                    <p style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)", margin: "4px 0" }}>
                      {dayLabel(event.startDate)}
                    </p>
                  </div>
                  <div style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
                        {event.title}
                      </h3>
                      <Badge variant={config.variant} style={{ fontSize: "10px" }}>
                        {config.label}
                      </Badge>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
                      {timeLabel(event.startDate)}
                      {event.location && ` \u2022 ${event.location}`}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Event</DialogTitle>
              <DialogDescription>
                Create a new event for your organization.
              </DialogDescription>
            </DialogHeader>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                  Title
                </label>
                <Input
                  placeholder="Enter event title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                  Description
                </label>
                <Textarea
                  placeholder="Describe the event"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                    Start Date & Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                    End Date & Time
                  </label>
                  <Input
                    type="datetime-local"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
                  Location
                </label>
                <Input
                  placeholder="Enter location"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Switch
                  checked={newIsPublic}
                  onCheckedChange={setNewIsPublic}
                  id="is-public"
                />
                <label
                  htmlFor="is-public"
                  style={{ fontSize: "13px", color: "var(--color-text)", cursor: "pointer" }}
                >
                  Public event
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newTitle.trim() || !newStartDate || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      <TabsContent value="calendar">
        <CalendarView
          items={calendarItems}
          onItemClick={handleCalendarItemClick}
        />
      </TabsContent>

      <TabsContent value="plans">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 }}>
            Annual plans organize events by school year or semester.
          </p>
          {!annualPlans ? (
            <Card>
              <CardContent style={{ padding: "20px" }}>
                <Skeleton style={{ width: "60%", height: "16px", borderRadius: "5px", marginBottom: "8px" }} />
                <Skeleton style={{ width: "40%", height: "14px", borderRadius: "5px" }} />
              </CardContent>
            </Card>
          ) : annualPlans.length === 0 ? (
            <Card>
              <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                <FileText size={32} style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }} />
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                  No annual plans yet
                </p>
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                  Annual plans will appear here once created.
                </p>
              </CardContent>
            </Card>
          ) : (
            annualPlans.map((plan) => (
              <Card key={plan.id}>
                <CardContent style={{ padding: "20px" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                    {plan.name}
                  </h3>
                  {plan.description && (
                    <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
                      {plan.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    <span>
                      <strong style={{ color: "var(--color-text)" }}>Start: </strong>
                      {format(new Date(plan.startDate), "MMM d, yyyy")}
                    </span>
                    <span>
                      <strong style={{ color: "var(--color-text)" }}>End: </strong>
                      {format(new Date(plan.endDate), "MMM d, yyyy")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
