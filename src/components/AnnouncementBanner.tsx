"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { Button } from "@/components/ui/button";

interface ShowcaseItem {
    id: string;
    type: string;
    title: string;
    description: string | null;
    isActive: boolean;
    createdAt: string;
}

export default function AnnouncementBanner() {
    const portal = usePortal();
    const tC = useTranslations("common");
    const [dismissed, setDismissed] = useState(false);
    const { data } = useQuery({
        queryKey: [portal, "announcement-banner"],
        queryFn: () => fetchJson<ShowcaseItem[]>("/api/showcase?limit=50"),
        enabled: portal !== "",
    });
    if (dismissed) return null;
    const items = (data ?? []).filter((i) => i.type === "announcement" && i.isActive !== false);
    if (items.length === 0) return null;
    const latest = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                borderRadius: "5px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg-secondary)",
            }}
        >
            <Megaphone size={16} style={{ flexShrink: 0, color: "var(--color-primary)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <p
                    style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "var(--color-text)",
                        margin: 0,
                    }}
                >
                    {latest.title}
                </p>
                {latest.description && (
                    <p
                        style={{
                            fontSize: "13px",
                            color: "var(--color-text-secondary)",
                            margin: "2px 0 0",
                        }}
                    >
                        {latest.description}
                    </p>
                )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setDismissed(true)}>
                {tC("close")}
            </Button>
        </div>
    );
}
