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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Eye,
  EyeOff,
  Trash2,
  Plus,
  GripVertical,
  Image,
  Megaphone,
  Star,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";

interface ShowcaseItem {
  id: string;
  type: "event_feature" | "announcement" | "gallery_image";
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  sortOrder: number;
  isActive: boolean;
}

const TAB_CONFIG = [
  { value: "event_feature", label: "Featured Events", icon: Star },
  { value: "announcement", label: "Announcements", icon: Megaphone },
  { value: "gallery_image", label: "Gallery", icon: Image },
];

export default function ShowcaseAdminPage() {
  const portal = usePortal();
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`Showcase Admin | ${portalName}`);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isOfficer = role === "admin" || role === "officer";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("event_feature");
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery<ShowcaseItem[]>({
    queryKey: [portal, "showcase"],
    queryFn: () => fetchJson(`/api/showcase`),
  });

  const showcaseItems = items ?? [];

  const createMutation = useMutation({
    mutationFn: (body: {
      type: string;
      title: string;
      description?: string;
      imageUrl?: string;
      linkUrl?: string;
    }) =>
      fetchJson(`/api/showcase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "showcase"] });
      setShowForm(false);
      setFormTitle("");
      setFormDescription("");
      setFormImageUrl("");
      setFormLinkUrl("");
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      fetchJson(`/api/showcase/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "showcase"] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/showcase/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "showcase"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (body: { id: string; sortOrder: number }[]) =>
      fetchJson(`/api/showcase/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "showcase"] });
    },
  });

  function handleCreate() {
    if (!formTitle.trim()) return;
    createMutation.mutate({
      type: activeTab,
      title: formTitle.trim(),
      description: formDescription.trim() || undefined,
      imageUrl: formImageUrl.trim() || undefined,
      linkUrl: formLinkUrl.trim() || undefined,
    });
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;
    const filtered = showcaseItems.filter((i) => i.type === activeTab);
    const fromIdx = filtered.findIndex((i) => i.id === draggedId);
    const toIdx = filtered.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reordered = [...filtered];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    reorderMutation.mutate(
      reordered.map((item, idx) => ({ id: item.id, sortOrder: idx }))
    );
    setDraggedId(null);
  }

  const filteredItems = showcaseItems.filter((i) => i.type === activeTab);

  if (!isOfficer) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "64px 24px",
          color: "var(--color-text-secondary)",
          fontSize: "14px",
        }}
      >
        <p style={{ margin: 0 }}>You do not have permission to manage the showcase.</p>
      </div>
    );
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
            Showcase Admin
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Manage the public showcase content
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <TabsList>
            {TAB_CONFIG.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          <Button
            onClick={() => setShowForm(!showForm)}
            variant={showForm ? "outline" : "default"}
          >
            <Plus size={16} />
            <span>{showForm ? "Cancel" : "Add Item"}</span>
          </Button>
        </div>

        {showForm && (
          <Card style={{ marginBottom: "16px" }}>
            <CardContent style={{ padding: "20px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                <Input
                  placeholder="Title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                />
                <Input
                  placeholder="Image URL (optional)"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                />
                <Input
                  placeholder="Link URL (optional)"
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    onClick={handleCreate}
                    disabled={!formTitle.trim() || createMutation.isPending}
                  >
                    {createMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {TAB_CONFIG.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {isLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    style={{ width: "100%", height: "72px", borderRadius: "5px" }}
                  />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    fontSize: "14px",
                  }}
                >
                  <p style={{ margin: 0 }}>No items yet. Click &quot;Add Item&quot; to get started.</p>
                </CardContent>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragEnd={() => setDraggedId(null)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "5px",
                      backgroundColor: "var(--color-bg)",
                      opacity: draggedId === item.id ? 0.5 : 1,
                      cursor: "grab",
                    }}
                  >
                    <GripVertical
                      size={18}
                      style={{
                        color: "var(--color-text-secondary)",
                        flexShrink: 0,
                        cursor: "grab",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          marginBottom: "2px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text)",
                          }}
                        >
                          {item.title}
                        </span>
                        {!item.isActive && (
                          <Badge variant="outline" style={{ fontSize: "11px" }}>
                            Hidden
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p
                          style={{
                            fontSize: "13px",
                            color: "var(--color-text-secondary)",
                            margin: 0,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        toggleActive.mutate({ id: item.id, isActive: item.isActive })
                      }
                      title={item.isActive ? "Hide" : "Show"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        color: item.isActive
                          ? "var(--color-success)"
                          : "var(--color-text-secondary)",
                        flexShrink: 0,
                      }}
                    >
                      {item.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this item?")) deleteItem.mutate(item.id);
                      }}
                      title="Delete"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "36px",
                        height: "36px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "5px",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        color: "var(--color-destructive)",
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
