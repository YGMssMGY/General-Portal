"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import {
  User,
  Mail,
  Shield,
  Star,
  Send,
  Trophy,
  Settings as SettingsIcon,
  Plus,
  X,
} from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Kudos {
  id: string;
  fromName: string;
  message: string;
  createdAt: string;
}

interface KudosLeaderboardEntry {
  id: string;
  name: string;
  count: number;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

export default function AccountsPage() {
  const portal = getPortal();
  const qc = useQueryClient();
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [kudosMember, setKudosMember] = useState("");
  const [kudosMessage, setKudosMessage] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "member" });

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: [portal, "me"],
    queryFn: () => fetchJson(`/api/me`),
  });

  const { data: kudos } = useQuery<Kudos[]>({
    queryKey: [portal, "kudos"],
    queryFn: () => fetchJson(`/api/kudos`),
  });

  const { data: leaderboard } = useQuery<KudosLeaderboardEntry[]>({
    queryKey: [portal, "kudos", "leaderboard"],
    queryFn: () => fetchJson(`/api/kudos/leaderboard`),
  });

  const { data: adminUsers } = useQuery<AdminUser[]>({
    queryKey: [portal, "admin", "users"],
    queryFn: () => fetchJson(`/api/admin/users`),
    enabled: profile?.role === "admin",
  });

  const updateProfile = useMutation({
    mutationFn: (name: string) =>
      fetchJson(`/api/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "me"] });
      setEditName(false);
    },
  });

  const sendKudos = useMutation({
    mutationFn: (data: { receiverId: string; message: string }) =>
      fetchJson(`/api/kudos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "kudos"] });
      qc.invalidateQueries({ queryKey: [portal, "kudos", "leaderboard"] });
      setKudosMember("");
      setKudosMessage("");
    },
  });

  const createUser = useMutation({
    mutationFn: (data: typeof newUser) =>
      fetchJson(`/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "admin", "users"] });
      setShowCreateUser(false);
      setNewUser({ name: "", email: "", role: "member" });
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      fetchJson(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "admin", "users"] });
    },
  });

  if (profileLoading) {
    return <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
        Accounts
      </h1>

      <Section title="Profile">
        {profile && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div>
                {editName ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      style={{ ...inputStyle, width: "200px" }}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => updateProfile.mutate(nameInput)}
                      disabled={!nameInput.trim() || updateProfile.isPending}
                      style={{
                        ...btnBase,
                        backgroundColor: "var(--color-primary)",
                        color: "#fff",
                        opacity: !nameInput.trim() || updateProfile.isPending ? 0.5 : 1,
                      }}
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditName(false)} style={{ ...btnBase, backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div
                    style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text)", cursor: "pointer" }}
                    onClick={() => { setNameInput(profile.name); setEditName(true); }}
                  >
                    {profile.name} <span style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: 400 }}>Edit</span>
                  </div>
                )}
                <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Mail size={13} /> {profile.email}
                </div>
                <div style={{ marginTop: "4px" }}>
                  <RoleBadge role={profile.role} />
                </div>
              </div>
            </div>
          </div>
        )}
      </Section>

      <Section title="Kudos">
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "16px",
            backgroundColor: "var(--color-bg-secondary)",
          }}
        >
          <h4 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "var(--color-text)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Send size={16} /> Send Kudos
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              style={inputStyle}
              placeholder="Receiver member ID or select..."
              value={kudosMember}
              onChange={(e) => setKudosMember(e.target.value)}
            />
            <textarea
              style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
              placeholder="Write a message..."
              value={kudosMessage}
              onChange={(e) => setKudosMessage(e.target.value)}
            />
            <button
              type="button"
              onClick={() => sendKudos.mutate({ receiverId: kudosMember, message: kudosMessage })}
              disabled={!kudosMember.trim() || !kudosMessage.trim() || sendKudos.isPending}
              style={{
                ...btnBase,
                backgroundColor: "var(--color-primary)",
                color: "#fff",
                alignSelf: "flex-start",
                opacity: !kudosMember.trim() || !kudosMessage.trim() || sendKudos.isPending ? 0.5 : 1,
              }}
            >
              <Send size={14} /> Send
            </button>
          </div>
        </div>

        {kudos && kudos.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-text)" }}>
              Received Kudos
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {kudos.map((k) => (
                <div
                  key={k.id}
                  style={{
                    display: "flex",
                    gap: "10px",
                    padding: "10px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--color-bg)",
                  }}
                >
                  <Star size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text)" }}>
                      <strong>{k.fromName}</strong>: {k.message}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      {new Date(k.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {leaderboard && leaderboard.length > 0 && (
          <div style={{ marginTop: "16px" }}>
            <h4 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 8px", color: "var(--color-text)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Trophy size={16} color="var(--color-warning)" /> Kudos Leaderboard
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: idx === 0 ? "var(--color-primary-light)" : "var(--color-bg)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: idx === 0 ? "var(--color-warning)" : idx === 1 ? "var(--color-bg-secondary)" : idx === 2 ? "var(--color-bg-secondary)" : "transparent",
                        color: idx === 0 ? "#000" : "var(--color-text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text)" }}>{entry.name}</span>
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                    {entry.count} kudos
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {profile?.role === "admin" && (
        <Section title="Admin — User Management">
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
            <button
              type="button"
              onClick={() => setShowCreateUser(true)}
              style={{ ...btnBase, backgroundColor: "var(--color-primary)", color: "#fff" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-primary)")}
            >
              <Plus size={16} /> Create User
            </button>
          </div>

          {showCreateUser && (
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                padding: "16px",
                marginBottom: "12px",
                backgroundColor: "var(--color-bg-secondary)",
              }}
            >
              <h4 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px", color: "var(--color-text)" }}>
                New User
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  style={inputStyle}
                  placeholder="Name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
                <input
                  style={inputStyle}
                  placeholder="Email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
                <select
                  style={selectStyle}
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="member">Member</option>
                  <option value="officer">Officer</option>
                  <option value="admin">Admin</option>
                </select>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => createUser.mutate(newUser)}
                    disabled={!newUser.name || !newUser.email || createUser.isPending}
                    style={{
                      ...btnBase,
                      backgroundColor: "var(--color-primary)",
                      color: "#fff",
                      opacity: !newUser.name || !newUser.email || createUser.isPending ? 0.5 : 1,
                    }}
                  >
                    {createUser.isPending ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    style={{ ...btnBase, backgroundColor: "transparent", color: "var(--color-text-secondary)", border: "1px solid var(--color-border)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="hidden md:block" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(adminUsers ?? []).map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={tdStyle}>{u.name}</td>
                    <td style={tdStyle}>{u.email}</td>
                    <td style={tdStyle}><RoleBadge role={u.role} /></td>
                    <td style={tdStyle}>
                      <select
                        style={{ ...selectStyle, width: "auto", padding: "4px 8px", fontSize: "12px" }}
                        value={u.role}
                        onChange={(e) => changeRole.mutate({ userId: u.id, role: e.target.value })}
                      >
                        <option value="member">Member</option>
                        <option value="officer">Officer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(adminUsers ?? []).map((u) => (
              <div
                key={u.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px",
                  backgroundColor: "var(--color-bg)",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text)" }}>{u.name}</div>
                <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginBottom: "6px" }}>{u.email}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <RoleBadge role={u.role} />
                  <select
                    style={{ ...selectStyle, width: "auto", padding: "4px 8px", fontSize: "12px" }}
                    value={u.role}
                    onChange={(e) => changeRole.mutate({ userId: u.id, role: e.target.value })}
                  >
                    <option value="member">Member</option>
                    <option value="officer">Officer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 12px", color: "var(--color-text)" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    admin: "var(--color-primary)",
    officer: "var(--color-success)",
    member: "var(--color-text-secondary)",
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "var(--radius-sm)",
        fontSize: "12px",
        fontWeight: 600,
        color: colors[role] ?? colors.member,
        backgroundColor: "var(--color-bg-secondary)",
        textTransform: "capitalize",
      }}
    >
      <Shield size={12} /> {role}
    </span>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
};
