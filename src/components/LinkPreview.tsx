"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { ExternalLink, ImageOff } from "lucide-react";

interface LinkPreviewData {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

export function LinkPreview({ url }: { url: string }) {
  const { data, isLoading, isError } = useQuery<LinkPreviewData>({
    queryKey: ["link-preview", url],
    queryFn: () => fetchJson(`/api/link-preview?url=${encodeURIComponent(url)}`),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 2000,
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          border: "1px solid var(--color-border)",
          borderRadius: "5px",
          marginTop: "4px",
          backgroundColor: "var(--color-bg-secondary)",
          fontSize: "12px",
          color: "var(--color-text-secondary)",
        }}
      >
        <ExternalLink size={14} />
        Loading preview...
      </div>
    );
  }

  if (isError || (!data?.title && !data?.description && !data?.siteName)) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        gap: "10px",
        padding: "10px 12px",
        border: "1px solid var(--color-border)",
        borderRadius: "5px",
        marginTop: "4px",
        textDecoration: "none",
        backgroundColor: "var(--color-bg)",
        transition: "background-color 100ms ease",
        maxWidth: "100%",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--color-bg)")}
    >
      {data.image && (
        <div
          style={{
            width: "80px",
            minWidth: "80px",
            height: "60px",
            borderRadius: "5px",
            overflow: "hidden",
            backgroundColor: "var(--color-bg-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={data.image}
            alt={data.title ?? "Link preview"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const fallback = el.parentElement?.querySelector(".preview-fallback") as HTMLElement | null;
              if (fallback) fallback.style.display = "flex";
            }}
          />
          <ImageOff size={16} className="preview-fallback" style={{ display: "none", color: "var(--color-text-secondary)" }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        {data.title && (
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text)",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.title}
          </span>
        )}
        {data.description && (
          <span
            style={{
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              display: "block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              marginTop: "2px",
            }}
          >
            {data.description}
          </span>
        )}
        <span
          style={{
            fontSize: "11px",
            color: "var(--color-text-secondary)",
            display: "block",
            marginTop: "2px",
          }}
        >
          {data.siteName || (() => { try { return new URL(url).hostname; } catch { return url; } })()}
        </span>
      </div>
    </a>
  );
}
