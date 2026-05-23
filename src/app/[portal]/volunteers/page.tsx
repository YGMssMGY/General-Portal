"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { Plus, UserCheck, UserX, Clock, Users, Trophy } from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface VolunteerSlot {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  capacity: number;
  signedUp: number;
  userSignedUp: boolean;
}

interface VolunteerStats {
  totalSlots: number;
  mySignups: number;
  topVolunteers: { name: string; count: number }[];
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
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "background-color 100ms ease",
};

export default function VolunteersPage() {
  const portal = getPortal();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startTime: "", endTime: "", capacity: 1 });

  const { data: slots, isLoading: slotsLoading } = useQuery<VolunteerSlot[]>({
    queryKey: [portal, "volunteers"],
    queryFn: () => fetchJson(`/api/volunteers`),
  });

  const { data: stats, isLoading: statsLoading } = useQuery<VolunteerStats>({
    queryKey: [portal, "volunteers", "stats"],
    queryFn: () => fetchJson(`/api/volunteers/stats`),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetchJson(`/api/volunteers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "volunteers"] });
      qc.invalidateQueries({ queryKey: [portal, "volunteers", "stats"] });
      setShowForm(false);
      setForm({ title: "", description: "", startTime: "", endTime: "", capacity: 1 });
    },
  });

  const signupMutation = useMutation({
    mutationFn: (slotId: string) =>
      fetchJson(`/api/volunteers/signups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "volunteers"] });
      qc.invalidateQueries({ queryKey: [portal, "volunteers", "stats"] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (slotId: string) =>
      fetchJson(`/api/volunteers/signups`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "volunteers"] });
      qc.invalidateQueries({ queryKey: [portal, "volunteers", "stats"] });
    },
  });

  if (slotsLoading || statsLoading) {
    return <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>;
  }

  const slotList = slots ?? [];

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
          Volunteer Signups
        </h1>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{ ...btnBase, backgroundColor: "var(--color-primary)", color: "#fff" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary)")}
        >
          <Plus size={16} /> New Slot
        </button>
      </div>

      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <div style={statCardStyle}>
            <Clock size={18} color="var(--color-primary)" />
            <span style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)" }}>{stats.totalSlots}</span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Total Slots</span>
          </div>
          <div style={statCardStyle}>
            <UserCheck size={18} color="var(--color-success)" />
            <span style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-text)" }}>{stats.mySignups}</span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>My Signups</span>
          </div>
          <div style={statCardStyle}>
            <Trophy size={18} color="var(--color-warning)" />
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text)" }}>
              {stats.topVolunteers.slice(0, 3).map((v) => v.name).join(", ") || "None"}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Top Volunteers</span>
          </div>
        </div>
      )}

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
            Create Volunteer Slot
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input
                style={inputStyle}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
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
              <label style={labelStyle}>Capacity</label>
              <input
                type="number"
                min={1}
                style={inputStyle}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => createMutation.mutate(form)}
                disabled={!form.title || !form.startTime || !form.endTime || createMutation.isPending}
                style={{
                  ...btnBase,
                  backgroundColor: "var(--color-primary)",
                  color: "#fff",
                  opacity: !form.title || !form.startTime || !form.endTime || createMutation.isPending ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!createMutation.isPending) e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-primary)";
                }}
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

      {slotList.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          <Users size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No volunteer slots available yet.</p>
          <p style={{ margin: "4px 0 0", fontSize: "13px" }}>Create one to get started.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {slotList.map((slot) => {
            const pct = slot.capacity > 0 ? (slot.signedUp / slot.capacity) * 100 : 0;
            const full = slot.signedUp >= slot.capacity;
            return (
              <div
                key={slot.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                  backgroundColor: "var(--color-bg)",
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
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 4px", color: "var(--color-text)" }}>
                      {slot.title}
                    </h3>
                    {slot.description && (
                      <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 8px" }}>
                        {slot.description}
                      </p>
                    )}
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px", color: "var(--color-text-secondary)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={14} />
                        {new Date(slot.startTime).toLocaleString()} – {new Date(slot.endTime).toLocaleString()}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Users size={14} />
                        {slot.signedUp}/{slot.capacity} signed up
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px", minWidth: "120px" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "6px",
                        backgroundColor: "var(--color-bg-secondary)",
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          height: "100%",
                          backgroundColor: full ? "var(--color-destructive)" : "var(--color-primary)",
                          borderRadius: "var(--radius-sm)",
                          transition: "width 200ms ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "11px", color: full ? "var(--color-destructive)" : "var(--color-text-secondary)", fontWeight: 600 }}>
                      {full ? "Full" : `${Math.round(pct)}% filled`}
                    </span>
                  </div>
                </div>
                <div style={{ marginTop: "12px" }}>
                  {slot.userSignedUp ? (
                    <button
                      type="button"
                      onClick={() => cancelMutation.mutate(slot.id)}
                      disabled={cancelMutation.isPending}
                      style={{
                        ...btnBase,
                        backgroundColor: "transparent",
                        color: "var(--color-destructive)",
                        border: "1px solid var(--color-destructive)",
                        opacity: cancelMutation.isPending ? 0.5 : 1,
                      }}
                    >
                      <UserX size={15} /> Cancel
                    </button>
                  ) : !full ? (
                    <button
                      type="button"
                      onClick={() => signupMutation.mutate(slot.id)}
                      disabled={signupMutation.isPending}
                      style={{
                        ...btnBase,
                        backgroundColor: "var(--color-primary)",
                        color: "#fff",
                        opacity: signupMutation.isPending ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!signupMutation.isPending) e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--color-primary)";
                      }}
                    >
                      <UserCheck size={15} /> Sign Up
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const statCardStyle: React.CSSProperties = {
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  backgroundColor: "var(--color-bg)",
};
