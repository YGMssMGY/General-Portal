"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Users, Plus, LogIn, Palette } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Subgroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  _count: { members: number };
  isMember: boolean;
}

const PRESET_COLORS = [
  "#0f62fe",
  "#da1e28",
  "#24a148",
  "#f1c21b",
  "#8a3ffc",
  "#ff7eb6",
  "#6f6f6f",
  "#161616",
];

export default function SubgroupsHubPage() {
  const portal = usePortal();
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`Subgroups | ${portalName}`);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isOfficer = role === "admin" || role === "officer";
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  const { data: subgroups, isLoading } = useQuery<Subgroup[]>({
    queryKey: [portal, "subgroups"],
    queryFn: () => fetchJson(`/api/subgroups`),
  });

  const subgroupList = subgroups ?? [];

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string; color?: string }) =>
      fetchJson(`/api/subgroups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "subgroups"] });
      setShowCreate(false);
      setNewName("");
      setNewDescription("");
      setNewColor(PRESET_COLORS[0]);
    },
  });

  const joinMutation = useMutation({
    mutationFn: (subgroupId: string) =>
      fetchJson(`/api/subgroups/${subgroupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [session?.user?.id] }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "subgroups"] });
    },
  });

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      color: newColor,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
            }}
          >
            Subgroups
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Smaller teams within the organization
          </p>
        </div>
        {isOfficer && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            <span>Create Subgroup</span>
          </Button>
        )}
      </div>

      {isLoading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent style={{ padding: "20px" }}>
                <div style={{ display: "flex", gap: "12px" }}>
                  <Skeleton
                    style={{
                      width: "4px",
                      height: "80px",
                      borderRadius: "5px",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <Skeleton
                      style={{
                        width: "60%",
                        height: "16px",
                        borderRadius: "5px",
                        marginBottom: "8px",
                      }}
                    />
                    <Skeleton
                      style={{
                        width: "80%",
                        height: "14px",
                        borderRadius: "5px",
                        marginBottom: "8px",
                      }}
                    />
                    <Skeleton
                      style={{
                        width: "40%",
                        height: "14px",
                        borderRadius: "5px",
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : subgroupList.length === 0 ? (
        <Card>
          <CardContent
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--color-text-secondary)",
            }}
          >
            <Users
              size={32}
              style={{ marginBottom: "12px", opacity: 0.5 }}
            />
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text)", margin: "0 0 4px" }}>
              No subgroups yet
            </p>
            <p style={{ fontSize: "13px", margin: 0 }}>
              {isOfficer
                ? "Create a subgroup to organize your team."
                : "Ask an officer to create a subgroup."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "16px",
          }}
        >
          {subgroupList.map((group) => (
            <Card key={group.id}>
              <CardContent style={{ padding: 0 }}>
                <div
                  style={{
                    display: "flex",
                    minHeight: "100px",
                  }}
                >
                  <div
                    style={{
                      width: "5px",
                      flexShrink: 0,
                      backgroundColor: group.color ?? "var(--color-primary)",
                      borderRadius: "5px 0 0 5px",
                    }}
                  />
                  <div
                    style={{
                      flex: 1,
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--color-text)",
                          margin: 0,
                        }}
                      >
                        {group.name}
                      </h3>
                      {group.description && (
                        <p
                          style={{
                            fontSize: "13px",
                            color: "var(--color-text-secondary)",
                            margin: "4px 0 0",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {group.description}
                        </p>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: "auto",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--color-text-secondary)",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Users size={14} />
                        {group._count.members} member
                        {group._count.members !== 1 ? "s" : ""}
                      </span>
                      <a
                        href={`/${portal}/subgroups/${group.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!group.isMember) {
                            joinMutation.mutate(group.id);
                          }
                          window.location.href = `/${portal}/subgroups/${group.id}`;
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          borderRadius: "5px",
                          fontSize: "13px",
                          fontWeight: 600,
                          fontFamily: "inherit",
                          cursor: "pointer",
                          border: "none",
                          backgroundColor: "var(--color-primary)",
                          color: "#fff",
                          textDecoration: "none",
                          minHeight: "36px",
                        }}
                      >
                        <LogIn size={14} />
                        <span>Enter</span>
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subgroup</DialogTitle>
            <DialogDescription>
              Create a new subgroup within the organization.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Name
              </label>
              <Input
                placeholder="e.g. Website Redesign"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Description
              </label>
              <Textarea
                placeholder="Describe the subgroup's purpose"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Color
              </label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "5px",
                      border:
                        newColor === c
                          ? "3px solid var(--color-text)"
                          : "2px solid var(--color-border)",
                      backgroundColor: c,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
                ))}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginLeft: "8px",
                  }}
                >
                  <Palette size={14} style={{ color: "var(--color-text-secondary)" }} />
                  <Input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    style={{
                      width: "48px",
                      height: "32px",
                      padding: "2px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
