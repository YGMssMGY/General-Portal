"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { useSession } from "next-auth/react";
import { Search, X, Shield, Mail, User, ArrowUp, ArrowDown, Trash2 } from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

const roleConfig: Record<string, { color: string; bg: string }> = {
  admin: { color: "var(--color-primary)", bg: "var(--color-primary-light)" },
  officer: { color: "var(--color-success)", bg: "#e8f5e9" },
  member: { color: "var(--color-text-secondary)", bg: "var(--color-bg-secondary)" },
};

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

const ROLES = ["admin", "officer", "member"] as const;

export default function MembersPage() {
  const portal = getPortal();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.role;
  const isAdmin = currentUserRole === "admin";
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: [portal, "members"],
    queryFn: () => fetchJson(`/api/members`),
  });

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      fetchJson(`/api/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [portal, "members"] }),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      fetchJson(`/api/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "members"] });
      setSelectedMember(null);
    },
  });

  const filtered = useMemo(() => {
    if (!members) return [];
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  if (isLoading) {
    return <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>;
  }

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
          Members
        </h1>
      </div>

      <div style={{ position: "relative", marginBottom: "20px", maxWidth: "400px" }}>
        <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)", pointerEvents: "none" }} />
        <input
          style={{ ...inputStyle, paddingLeft: "36px" }}
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              right: "8px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              padding: "4px",
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 16px",
            color: "var(--color-text-secondary)",
            fontSize: "14px",
          }}
        >
          <User size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
          <p style={{ margin: 0 }}>No members found.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                  <th style={thStyle}>Member</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer" }}
                    onClick={() => setSelectedMember(member)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: "var(--color-primary)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "14px",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{member.name}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Mail size={14} /> {member.email}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <RoleBadge role={member.role} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map((member) => (
              <div
                key={member.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px",
                  backgroundColor: "var(--color-bg)",
                  cursor: "pointer",
                }}
                onClick={() => setSelectedMember(member)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-primary)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--color-text)" }}>{member.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Mail size={12} /> {member.email}
                    </div>
                  </div>
                </div>
                <RoleBadge role={member.role} />
              </div>
            ))}
          </div>
        </>
      )}

      {selectedMember && (
        <MemberDetail member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg = roleConfig[role] ?? roleConfig.member;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        fontSize: "12px",
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        textTransform: "capitalize",
      }}
    >
      <Shield size={12} />
      {role}
    </span>
  );
}

function MemberDetail({ member, onClose }: { member: Member; onClose: () => void }) {
  const portal = getPortal();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.role;
  const isAdmin = currentUserRole === "admin";

  const { data: detail } = useQuery<Member & { membershipId?: string }>({
    queryKey: [portal, "members", member.id],
    queryFn: () => fetchJson(`/api/members/${member.id}`),
    enabled: !!member.id,
  });

  const updateRole = useMutation({
    mutationFn: (role: string) =>
      fetchJson(`/api/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "members"] });
      qc.invalidateQueries({ queryKey: [portal, "members", member.id] });
    },
  });

  const removeMember = useMutation({
    mutationFn: () =>
      fetchJson(`/api/members/${member.id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "members"] });
      onClose();
    },
  });

  const currentRole = detail?.role ?? member.role;
  const roleIndex = ROLES.indexOf(currentRole as typeof ROLES[number]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          borderRadius: "var(--radius-sm)",
          padding: "24px",
          width: "90%",
          maxWidth: "420px",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
            Member Details
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-secondary)",
              padding: "4px",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                fontSize: "18px",
                fontWeight: 700,
              }}
            >
              {(detail?.name ?? member.name)?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--color-text)" }}>
                {detail?.name ?? member.name}
              </div>
              <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "4px" }}>
                <Mail size={13} /> {detail?.email ?? member.email}
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Current Role
            </div>
            <RoleBadge role={currentRole} />
          </div>

          {isAdmin && member.id !== (session?.user as any)?.id && (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Admin Actions
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {roleIndex < ROLES.length - 1 && (
                  <button
                    type="button"
                    onClick={() => updateRole.mutate(ROLES[roleIndex + 1])}
                    disabled={updateRole.isPending}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--color-bg)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      color: "var(--color-text)",
                      transition: "background-color 100ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg)"; }}
                  >
                    <ArrowUp size={14} style={{ color: "var(--color-success)" }} />
                    Promote to {ROLES[roleIndex + 1]}
                  </button>
                )}
                {roleIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => updateRole.mutate(ROLES[roleIndex - 1])}
                    disabled={updateRole.isPending}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      border: "1px solid var(--color-destructive)",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--color-bg)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      color: "var(--color-destructive)",
                      transition: "background-color 100ms ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fff5f5"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg)"; }}
                  >
                    <ArrowDown size={14} style={{ color: "var(--color-destructive)" }} />
                    Demote to {ROLES[roleIndex - 1]}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { if (confirm("Remove this member from the portal?")) removeMember.mutate(); }}
                  disabled={removeMember.isPending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    border: "1px solid var(--color-destructive)",
                    borderRadius: "var(--radius-sm)",
                    backgroundColor: "var(--color-bg)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    color: "var(--color-destructive)",
                    transition: "background-color 100ms ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#fff5f5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-bg)"; }}
                >
                  <Trash2 size={14} />
                  Remove from Portal
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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
  padding: "12px",
  verticalAlign: "middle",
};
