"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link2, Plus, ExternalLink, Trash2 } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { LinkPreview } from "@/components/LinkPreview";

interface LinkData {
  id: string;
  title: string;
  url: string;
  category: string;
  description: string | null;
  createdBy: { id: string; name: string | null };
  createdAt: string;
}

const CATEGORIES = ["Google Drive", "Teams", "Other"] as const;

export default function LinksPage() {
  const portal = usePortal();
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`Links | ${portalName}`);
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newCategory, setNewCategory] = useState("Google Drive");
  const [newDescription, setNewDescription] = useState("");

  const { data, isLoading, isError } = useQuery<LinkData[]>({
    queryKey: [portal, "links"],
    queryFn: () => fetchJson<LinkData[]>(`/api/links`),
  });

  const createMutation = useMutation({
    mutationFn: (body: { title: string; url: string; category: string; description: string }) =>
      fetchJson<LinkData>(`/api/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [portal, "links"] });
      setShowForm(false);
      setNewTitle("");
      setNewUrl("");
      setNewCategory("Google Drive");
      setNewDescription("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJson(`/api/links/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [portal, "links"] }),
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
              Links
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-text-secondary)",
                margin: "4px 0 0",
              }}
            >
              Shared links repository
            </p>
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent style={{ padding: "20px" }}>
              <Skeleton
                style={{
                  width: "40%",
                  height: "16px",
                  borderRadius: "5px",
                  marginBottom: "8px",
                }}
              />
              <Skeleton
                style={{
                  width: "60%",
                  height: "14px",
                  borderRadius: "5px",
                }}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px" }}>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-destructive)",
            margin: 0,
          }}
        >
          Failed to load links.
        </p>
      </div>
    );
  }

  const links = data ?? [];

  const grouped: Record<string, LinkData[]> = {};
  for (const link of links) {
    const cat = link.category || "Other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(link);
  }

  function handleCreate() {
    if (!newTitle.trim() || !newUrl.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      url: newUrl.trim(),
      category: newCategory,
      description: newDescription.trim(),
    });
  }

  const categoryColors: Record<string, { bg: string; text: string }> = {
    "Google Drive": { bg: "rgba(52, 168, 83, 0.1)", text: "#34a853" },
    Teams: { bg: "rgba(98, 100, 167, 0.1)", text: "#6264a7" },
    Other: { bg: "rgba(15, 98, 254, 0.1)", text: "var(--color-primary)" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            Links
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              margin: "4px 0 0",
            }}
          >
            Shared links repository
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} />
          <span>Add Link</span>
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent style={{ padding: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--color-text)",
                  margin: 0,
                }}
              >
                New Link
              </h3>
              <Input
                placeholder="Link title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Input
                placeholder="URL (https://...)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
              />
              <div style={{ display: "flex", gap: "8px" }}>
                <Button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || !newUrl.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(grouped).length === 0 ? (
        <Card>
          <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
            <Link2
              size={32}
              style={{ color: "var(--color-text-secondary)", marginBottom: "12px" }}
            />
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-text)",
                margin: "0 0 4px",
              }}
            >
              No links yet
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              Add the first link for your organization.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([category, catLinks]) => {
          const colors = categoryColors[category] ?? categoryColors.Other;
          return (
            <div key={category}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "5px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: colors.bg,
                    color: colors.text,
                  }}
                >
                  {category}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {catLinks.length} link{catLinks.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {catLinks.map((link) => (
                  <Card key={link.id}>
                    <CardContent style={{ padding: "16px 20px" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: "14px",
                              fontWeight: 600,
                              color: "var(--color-primary)",
                              textDecoration: "none",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = "underline";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = "none";
                            }}
                          >
                            {link.title}
                            <ExternalLink size={12} />
                          </a>
                          {link.description && (
                            <p
                              style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: "4px 0 0",
                              }}
                            >
                              {link.description}
                            </p>
                          )}
                          <LinkPreview url={link.url} />
                          <p
                            style={{
                              fontSize: "11px",
                              color: "var(--color-text-secondary)",
                              margin: "6px 0 0",
                            }}
                          >
                            Added by {link.createdBy?.name ?? "Unknown"}
                          </p>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this link?"))
                                deleteMutation.mutate(link.id);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              border: "1px solid var(--color-destructive)",
                              borderRadius: "5px",
                              background: "var(--color-bg)",
                              cursor: "pointer",
                              color: "var(--color-destructive)",
                              flexShrink: 0,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
