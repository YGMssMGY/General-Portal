"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Image,
  FileSpreadsheet,
  FileArchive,
  Video,
  File,
  Upload,
  Trash2,
  Download,
  Link,
  Plus,
  ExternalLink,
} from "lucide-react";
import type { ReactNode } from "react";

interface FileItem {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  createdAt: string;
  uploadedBy: { id: string; name: string | null } | null;
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string | null;
  category: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null; image: string | null } | null;
}

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

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return Image;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  if (mime.includes("zip") || mime.includes("tar") || mime.includes("rar") || mime.includes("7z")) return FileArchive;
  if (mime.startsWith("video/")) return Video;
  if (mime.includes("pdf") || mime.includes("document") || mime.includes("text")) return FileText;
  return File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export default function FilesPage() {
  const portal = usePortal();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("files");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Links state
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkDescription, setLinkDescription] = useState("");

  // ---- Files ----
  const { data: files, isLoading: filesLoading } = useQuery<FileItem[]>({
    queryKey: [portal, "files"],
    queryFn: () => fetchJson(`/api/files?entityType=file`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "files"] });
      setConfirmDelete(null);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const form = new FormData();
      form.append("file", file);
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (evt) => {
        if (evt.lengthComputable) {
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });
      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        });
        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("POST", `/api/files?entityType=file`);
        xhr.send(form);
      });
      qc.invalidateQueries({ queryKey: [portal, "files"] });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ---- Links ----
  const { data: links, isLoading: linksLoading } = useQuery<LinkItem[]>({
    queryKey: [portal, "links"],
    queryFn: () => fetchJson(`/api/links`),
  });

  const createLink = useMutation({
    mutationFn: (body: { title: string; url: string; description?: string }) =>
      fetchJson(`/api/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "links"] });
      setShowLinkForm(false);
      setLinkTitle("");
      setLinkUrl("");
      setLinkDescription("");
    },
  });

  const deleteLink = useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/links/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [portal, "links"] });
    },
  });

  const fileList = files ?? [];
  const linkList = links ?? [];
  const groups = groupByDate(fileList);

  if (filesLoading) {
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
          Files & Links
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList style={{ marginBottom: "16px" }}>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="links">Links</TabsTrigger>
        </TabsList>

        <TabsContent value="files">
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                marginBottom: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  ...btnBase,
                  backgroundColor: "var(--color-primary)",
                  color: "#fff",
                  opacity: uploading ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!uploading) e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-primary)";
                }}
              >
                <Upload size={16} /> {uploading ? `Uploading ${uploadProgress}%` : "Upload File"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleUpload}
              />
            </div>

            {uploading && (
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  backgroundColor: "var(--color-bg-secondary)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--color-text)", marginBottom: "6px" }}>
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "6px",
                    backgroundColor: "var(--color-bg)",
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${uploadProgress}%`,
                      height: "100%",
                      backgroundColor: "var(--color-primary)",
                      borderRadius: "var(--radius-sm)",
                      transition: "width 200ms ease",
                    }}
                  />
                </div>
              </div>
            )}

            {fileList.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 16px",
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                }}
              >
                <File size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No files uploaded yet.</p>
              </div>
            ) : (
              Object.entries(groups).map(([date, groupFiles]) => (
                <div key={date} style={{ marginBottom: "24px" }}>
                  <h3
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--color-text-secondary)",
                      margin: "0 0 10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {date}
                  </h3>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    {groupFiles.map((f) => {
                      const Icon = getFileIcon(f.mimeType);
                      return (
                        <div
                          key={f.id}
                          style={{
                            border: "1px solid var(--color-border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "16px",
                            backgroundColor: "var(--color-bg)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "var(--radius-sm)",
                              backgroundColor: "var(--color-bg-secondary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--color-primary)",
                            }}
                          >
                            <Icon size={20} />
                          </div>
                          <div>
                            <p
                              style={{
                                margin: 0,
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "var(--color-text)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={f.fileName}
                            >
                              {f.fileName}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                              {formatSize(f.fileSize)} &middot; {f.uploadedBy?.name ?? "Unknown"}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: "6px", marginTop: "auto" }}>
                            <a
                              href={`/api/files/download/${f.id}`}
                              download
                              style={{
                                ...btnBase,
                                backgroundColor: "transparent",
                                color: "var(--color-primary)",
                                border: "1px solid var(--color-border)",
                                textDecoration: "none",
                                fontSize: "12px",
                                padding: "6px 12px",
                              }}
                            >
                              <Download size={13} /> Download
                            </a>
                            {confirmDelete === f.id ? (
                              <div style={{ display: "flex", gap: "4px" }}>
                                <button
                                  type="button"
                                  onClick={() => deleteMutation.mutate(f.id)}
                                  disabled={deleteMutation.isPending}
                                  style={{
                                    ...btnBase,
                                    backgroundColor: "var(--color-destructive)",
                                    color: "#fff",
                                    fontSize: "11px",
                                    padding: "6px 8px",
                                    opacity: deleteMutation.isPending ? 0.5 : 1,
                                  }}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(null)}
                                  style={{
                                    ...btnBase,
                                    backgroundColor: "transparent",
                                    color: "var(--color-text-secondary)",
                                    border: "1px solid var(--color-border)",
                                    fontSize: "11px",
                                    padding: "6px 8px",
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(f.id)}
                                style={{
                                  ...btnBase,
                                  backgroundColor: "transparent",
                                  color: "var(--color-destructive)",
                                  border: "1px solid var(--color-border)",
                                  fontSize: "12px",
                                  padding: "6px 12px",
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </>
        </TabsContent>

        <TabsContent value="links">
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                marginBottom: "16px",
              }}
            >
              <Button
                size="sm"
                onClick={() => setShowLinkForm(!showLinkForm)}
                variant={showLinkForm ? "outline" : "default"}
              >
                <Plus size={14} />
                <span>{showLinkForm ? "Cancel" : "Add Link"}</span>
              </Button>
            </div>

            {showLinkForm && (
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "16px",
                  marginBottom: "16px",
                  backgroundColor: "var(--color-bg-secondary)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <Input
                  placeholder="Title"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                />
                <Input
                  placeholder="URL"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={linkDescription}
                  onChange={(e) => setLinkDescription(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!linkTitle.trim() || !linkUrl.trim()) return;
                      createLink.mutate({
                        title: linkTitle.trim(),
                        url: linkUrl.trim(),
                        description: linkDescription.trim() || undefined,
                      });
                    }}
                    disabled={!linkTitle.trim() || !linkUrl.trim() || createLink.isPending}
                  >
                    {createLink.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            )}

            {linksLoading ? (
              <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading links...</div>
            ) : linkList.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "48px 16px",
                  color: "var(--color-text-secondary)",
                  fontSize: "14px",
                }}
              >
                <Link size={32} style={{ marginBottom: "12px", opacity: 0.5 }} />
                <p style={{ margin: 0 }}>No links added yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {linkList.map((linkItem) => (
                  <div
                    key={linkItem.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "12px 16px",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      backgroundColor: "var(--color-bg)",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--color-primary)",
                        flexShrink: 0,
                      }}
                    >
                      <Link size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a
                        href={linkItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: "var(--color-primary)",
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        {linkItem.title}
                        <ExternalLink size={12} />
                      </a>
                      {linkItem.description && (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--color-text-secondary)",
                            margin: "2px 0 0",
                          }}
                        >
                          {linkItem.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this link?")) deleteLink.mutate(linkItem.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "32px",
                        height: "32px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        color: "var(--color-destructive)",
                        flexShrink: 0,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function groupByDate(items: FileItem[]): Record<string, FileItem[]> {
  const groups: Record<string, FileItem[]> = {};
  for (const item of items) {
    const key = formatDate(item.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}
