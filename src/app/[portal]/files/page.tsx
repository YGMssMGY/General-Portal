"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
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
} from "lucide-react";

function getPortal(): string {
  if (typeof window === "undefined") return "developers";
  return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "developers";
}

interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploadedBy: string;
  url: string;
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
  const portal = getPortal();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: files, isLoading } = useQuery<FileItem[]>({
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

  if (isLoading) {
    return <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>Loading...</div>;
  }

  const fileList = files ?? [];
  const groups = groupByDate(fileList);

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
          File Repository
        </h1>
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
                        title={f.name}
                      >
                        {f.name}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                        {formatSize(f.size)} &middot; {f.uploadedBy}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "6px", marginTop: "auto" }}>
                      <a
                        href={f.url}
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
