"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { useSession } from "next-auth/react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Search, X, Mail, User, ArrowUp, ArrowDown, Trash2, Plus, Clock } from "lucide-react";
import { RoleBadge } from "@/components/RoleBadge";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface MemberProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

const ROLES = ["member", "officer", "admin"] as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontSize: "14px",
  border: "1px solid var(--color-border)",
  borderRadius: "5px",
  backgroundColor: "var(--color-bg)",
  color: "var(--color-text)",
  fontFamily: "inherit",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  appearance: "none",
  cursor: "pointer",
};

const btnBase: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: "5px",
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

export default function MembersPage() {
  const portal = usePortal();
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`Members | ${portalName}`);
  const qc = useQueryClient();
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.role;
  const isAdmin = currentUserRole === "admin";

  const [activeTab, setActiveTab] = useState("directory");

  // Profile edit state
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState("");

  // Members search & detail
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

  // Admin create user state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "member" });

  // ─── Queries ───

  const { data: profile, isLoading: profileLoading } = useQuery<MemberProfile>({
    queryKey: [portal, "me"],
    queryFn: () => fetchJson(`/api/me`),
  });

  const { data: members, isLoading: membersLoading } = useQuery<MemberProfile[]>({
    queryKey: [portal, "members"],
    queryFn: () => fetchJson(`/api/members`),
  });

  const { data: adminUsers } = useQuery<MemberProfile[]>({
    queryKey: [portal, "admin", "users"],
    queryFn: () => fetchJson(`/api/admin/users`),
    enabled: isAdmin,
  });

  const { data: historicalMembers } = useQuery<MemberProfile[]>({
    queryKey: [portal, "members", "historical"],
    queryFn: () => fetchJson(`/api/members/historical`),
    enabled: activeTab === "history",
  });

  // ─── Mutations ───

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

  const updateRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      fetchJson(`/api/members/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "members"] });
    },
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      fetchJson(`/api/members/${userId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "members"] });
      qc.invalidateQueries({ queryKey: [portal, "admin", "users"] });
    },
  });

  const createUser = useMutation({
    mutationFn: (data: { name: string; email: string; role: string }) =>
      fetchJson(`/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "admin", "users"] });
      qc.invalidateQueries({ queryKey: [portal, "members"] });
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
      qc.invalidateQueries({ queryKey: [portal, "members"] });
    },
  });

  // ─── Derived state ───

  const filtered = useMemo(() => {
    if (!members) return [];
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, search]);

  // ─── Loading ───

  if (profileLoading || membersLoading) {
    return (
      <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
        Loading...
      </div>
    );
  }

  // ─── Render ───

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <h1
        style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--color-text)" }}
      >
        Members
      </h1>

      {/* ─── Section 1: Profile Card ─── */}
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
                {(profile.name ?? "?").charAt(0).toUpperCase()}
              </div>
              <div>
                {editName ? (
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      style={{ ...inputStyle, width: "200px" }}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => updateProfile.mutate(nameInput)}
                      disabled={!nameInput.trim() || updateProfile.isPending}
                      style={{
                        ...btnBase,
                        backgroundColor: "var(--color-primary)",
                        color: "#fff",
                        opacity:
                          !nameInput.trim() || updateProfile.isPending ? 0.5 : 1,
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditName(false)}
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
                ) : (
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--color-text)",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setNameInput(profile.name);
                      setEditName(true);
                    }}
                  >
                    {profile.name}{" "}
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-primary)",
                        fontWeight: 400,
                      }}
                    >
                      Edit
                    </span>
                  </div>
                )}
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    marginTop: "2px",
                  }}
                >
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

      {/* ─── Section 2: Tabs for Members ─── */}
      <Section title="">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="directory">Directory</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="directory">
            <div style={{ position: "relative", marginBottom: "16px", maxWidth: "400px" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--color-text-secondary)",
                  pointerEvents: "none",
                }}
              />
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
                {/* Desktop table */}
                <div className="hidden md:block" style={{ overflowX: "auto" }}>
                  <table
                    style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
                  >
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
                          style={{
                            borderBottom: "1px solid var(--color-border)",
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedMember(member)}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "var(--color-bg-secondary)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "transparent")
                          }
                        >
                          <td style={tdStyle}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              }}
                            >
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
                              <span
                                style={{ fontWeight: 500, color: "var(--color-text)" }}
                              >
                                {member.name}
                              </span>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span
                              style={{
                                color: "var(--color-text-secondary)",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
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

                {/* Mobile cards */}
                <div
                  className="md:hidden"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {filtered.map((member) => (
                    <div
                      key={member.id}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                        padding: "14px",
                        backgroundColor: "var(--color-bg)",
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedMember(member)}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "8px",
                        }}
                      >
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
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "14px",
                              color: "var(--color-text)",
                            }}
                          >
                            {member.name}
                          </div>
                          <div
                            style={{
                              fontSize: "12px",
                              color: "var(--color-text-secondary)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
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
              <MemberDetail
                member={selectedMember}
                onClose={() => setSelectedMember(null)}
              />
            )}

            {/* ─── Admin User Management ─── */}
            {isAdmin && (
              <div style={{ marginTop: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(true)}
                    style={{
                      ...btnBase,
                      backgroundColor: "var(--color-primary)",
                      color: "#fff",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--color-primary-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "var(--color-primary)")
                    }
                  >
                    <Plus size={16} /> Add User
                  </button>
                </div>

                {showCreateUser && (
                  <div
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: "5px",
                      padding: "16px",
                      marginBottom: "12px",
                      backgroundColor: "var(--color-bg-secondary)",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        margin: "0 0 12px",
                        color: "var(--color-text)",
                      }}
                    >
                      New User
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <input
                        style={inputStyle}
                        placeholder="Name"
                        value={newUser.name}
                        onChange={(e) =>
                          setNewUser({ ...newUser, name: e.target.value })
                        }
                      />
                      <input
                        style={inputStyle}
                        placeholder="Email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) =>
                          setNewUser({ ...newUser, email: e.target.value })
                        }
                      />
                      <select
                        style={selectStyle}
                        value={newUser.role}
                        onChange={(e) =>
                          setNewUser({ ...newUser, role: e.target.value })
                        }
                      >
                        <option value="member">Member</option>
                        <option value="officer">Officer</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => createUser.mutate(newUser)}
                          disabled={
                            !newUser.name || !newUser.email || createUser.isPending
                          }
                          style={{
                            ...btnBase,
                            backgroundColor: "var(--color-primary)",
                            color: "#fff",
                            opacity:
                              !newUser.name || !newUser.email || createUser.isPending
                                ? 0.5
                                : 1,
                          }}
                        >
                          {createUser.isPending ? "Creating..." : "Create"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCreateUser(false)}
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
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                color: "var(--color-text-secondary)",
                fontSize: "14px",
              }}
            >
              <Clock size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
                Historical Members Archive
              </p>
              <p style={{ margin: "0 0 16px" }}>
                Historical members archive coming soon.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </Section>
    </div>
  );
}

// ─── Member Detail Modal ───

function MemberDetail({
  member,
  onClose,
}: {
  member: MemberProfile;
  onClose: () => void;
}) {
  const portal = usePortal();
  const qc = useQueryClient();
  const { data: session } = useSession();
  const currentUserRole = (session?.user as any)?.role;
  const isAdmin = currentUserRole === "admin";

  const { data: detail } = useQuery<MemberProfile>({
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
      qc.invalidateQueries({ queryKey: [portal, "admin", "users"] });
      onClose();
    },
  });

  const currentRole = detail?.role ?? member.role;
  const roleIndex = ROLES.indexOf(currentRole as (typeof ROLES)[number]);

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
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          borderRadius: "5px",
          padding: "24px",
          width: "90%",
          maxWidth: "420px",
          border: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 700,
              margin: 0,
              color: "var(--color-text)",
            }}
          >
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
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "15px",
                  color: "var(--color-text)",
                }}
              >
                {detail?.name ?? member.name}
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Mail size={13} /> {detail?.email ?? member.email}
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Current Role
            </div>
            <RoleBadge role={currentRole} />
          </div>

          {isAdmin && member.id !== (session?.user as any)?.id && (
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Admin Actions
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
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
                      borderRadius: "5px",
                      backgroundColor: "var(--color-bg)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      color: "var(--color-text)",
                      transition: "background-color 100ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        "var(--color-bg-secondary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-bg)";
                    }}
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
                      borderRadius: "5px",
                      backgroundColor: "var(--color-bg)",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontFamily: "inherit",
                      color: "var(--color-destructive)",
                      transition: "background-color 100ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff5f5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--color-bg)";
                    }}
                  >
                    <ArrowDown
                      size={14}
                      style={{ color: "var(--color-destructive)" }}
                    />
                    Demote to {ROLES[roleIndex - 1]}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Remove this member from the portal?"))
                      removeMember.mutate();
                  }}
                  disabled={removeMember.isPending}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    border: "1px solid var(--color-destructive)",
                    borderRadius: "5px",
                    backgroundColor: "var(--color-bg)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: "inherit",
                    color: "var(--color-destructive)",
                    transition: "background-color 100ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff5f5";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-bg)";
                  }}
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

// ─── Section Wrapper ───

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      {title && (
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            margin: "0 0 12px",
            color: "var(--color-text)",
          }}
        >
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

// ─── Shared Styles ───

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
