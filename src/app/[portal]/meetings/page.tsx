"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Plus, MapPin, Clock, Users, Calendar, Trash2 } from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

type RsvpStatus = "accepted" | "maybe" | "declined" | null;

interface Meeting {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
  rsvpCount: number;
  userRsvp: RsvpStatus;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontFamily: "inherit",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-text)",
  marginBottom: "4px",
  display: "block",
};

const btnBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "var(--radius-sm)",
  border: "none",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  minHeight: "36px",
  transition: "background-color 100ms ease",
};

const statusColors: Record<string, string> = {
  scheduled: "var(--color-primary)",
  ongoing: "var(--color-warning)",
  completed: "var(--color-text-secondary)",
  cancelled: "var(--color-destructive)",
};

export default function MeetingsPage() {
  const portal = getPortal();
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "admin";
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
  });

  const { data: meetings, isLoading } = useQuery<Meeting[]>({
    queryKey: [portal, "meetings"],
    queryFn: () => fetchJson(`/api/meetings`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetchJson(`/api/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "meetings"] });
      setShowForm(false);
      setForm({ title: "", description: "", startTime: "", endTime: "", location: "" });
    },
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RsvpStatus }) =>
      fetchJson(`/api/meetings/${id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "meetings"] });
    },
  });

  const deleteMeeting = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/meetings/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [portal, "meetings"] }),
  });

  if (isLoading) {
    return <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>;
  }

  const meetingList = meetings ?? [];
  const now = new Date();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
          Meetings
        </h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{ ...btnBase, backgroundColor: "var(--color-primary)", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary)")}
        >
          <Plus size={16} /> New Meeting
        </button>
      </div>

      {showForm && (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "16px",
            marginBottom: "20px",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <h3 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "var(--color-text)" }}>
            Create Meeting
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea
                style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Start Time</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>End Time</label>
                <input
                  type="datetime-local"
                  style={inputStyle}
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input style={inputStyle} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || !form.startTime || createMutation.isPending}
                style={{
                  ...btnBase,
                  backgroundColor: "var(--color-primary)",
                  color: "#fff",
                  opacity: !form.title || !form.startTime || createMutation.isPending ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!createMutation.isPending) e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-primary)"; }}
              >
                {createMutation.isPending ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  ...btnBase,
                  backgroundColor: "transparent",
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {meetingList.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          <Calendar size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No meetings scheduled.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {meetingList.map((meeting) => {
            const isPast = new Date(meeting.endTime) < now;
            const rsvpOptions: { label: string; value: RsvpStatus; color: string; activeColor: string }[] = [
              { label: "Accept", value: "accepted", color: "var(--color-text-secondary)", activeColor: "var(--color-success)" },
              { label: "Maybe", value: "maybe", color: "var(--color-text-secondary)", activeColor: "var(--color-warning)" },
              { label: "Decline", value: "declined", color: "var(--color-text-secondary)", activeColor: "var(--color-destructive)" },
            ];

            return (
              <div
                key={meeting.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                  backgroundColor: "var(--color-bg)",
                  opacity: isPast ? 0.6 : 1,
                  transition: "opacity 100ms ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "var(--color-text)" }}>
                        {meeting.title}
                      </h3>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: statusColors[meeting.status] ?? "var(--color-text-secondary)",
                          backgroundColor: "var(--color-bg-secondary)",
                          textTransform: "capitalize",
                        }}
                      >
                        {meeting.status}
                      </span>
                      {isPast && (
                        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)", fontStyle: "italic" }}>
                          Past
                        </span>
                      )}
                    </div>
                    {meeting.description && (
                      <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
                        {meeting.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "var(--color-text-secondary)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={14} />
                        {new Date(meeting.startTime).toLocaleString()} – {new Date(meeting.endTime).toLocaleTimeString()}
                      </span>
                      {meeting.location && (
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={14} /> {meeting.location}
                        </span>
                      )}
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Users size={14} /> {meeting.rsvpCount} RSVPs
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: "12px", display: "flex", gap: "6px" }}>
                  {rsvpOptions.map((opt) => {
                    const isSelected = meeting.userRsvp === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          rsvpMutation.mutate({
                            id: meeting.id,
                            status: isSelected ? null : opt.value,
                          })
                        }
                        disabled={rsvpMutation.isPending || isPast}
                        style={{
                          ...btnBase,
                          padding: "6px 12px",
                          fontSize: "12px",
                          backgroundColor: isSelected ? opt.activeColor : "transparent",
                          color: isSelected ? "#fff" : opt.color,
                          border: `1px solid ${isSelected ? opt.activeColor : "var(--color-border)"}`,
                          opacity: isPast ? 0.5 : 1,
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); if (confirm("Delete this meeting?")) deleteMeeting.mutate(meeting.id); }}
                      style={{ ...btnBase, padding:"6px 12px", fontSize:"12px", backgroundColor:"transparent", color:"var(--color-destructive)", border:"1px solid var(--color-destructive)", marginLeft:"auto" }}
                    >
                      <Trash2 size={14} style={{ marginRight:"4px" }} /> Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
