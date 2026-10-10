"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, ExternalLink } from "lucide-react";

interface SearchResult {
    id: string;
    title: string;
    snippet: string;
    type: "tasks" | "events" | "proposals" | "members" | "meetings";
    url: string;
}

interface SearchResponse {
    results: SearchResult[];
    total: number;
}

export default function SearchPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const t = useTranslations("search");
    const tn = useTranslations("nav");
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const [query, setQuery] = useState("");
    const [debounced, setDebounced] = useState("");
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleChange = useCallback((value: string) => {
        setQuery(value);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            setDebounced(value.trim());
        }, 300);
    }, []);

    const { data, isLoading } = useQuery<SearchResponse>({
        queryKey: [portal, "search", debounced],
        queryFn: () => fetchJson(`/api/search?q=${encodeURIComponent(debounced)}`),
        enabled: portal !== "" && debounced.length > 0,
    });

    const results = data?.results ?? [];

    const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
        if (!acc[r.type]) acc[r.type] = [];
        acc[r.type].push(r);
        return acc;
    }, {});

    function typeLabel(type: string): string {
        try {
            return tn(type);
        } catch {
            return type;
        }
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h1
                style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: 0,
                    color: "var(--color-text)",
                }}
            >
                {t("title")}
            </h1>

            <div style={{ position: "relative" }}>
                <SearchIcon
                    size={18}
                    style={{
                        position: "absolute",
                        left: "14px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--color-text-secondary)",
                        pointerEvents: "none",
                    }}
                />
                <Input
                    placeholder={t("placeholder")}
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    autoFocus
                    style={{ paddingLeft: "42px", height: "44px", fontSize: "16px" }}
                />
            </div>

            {isLoading && (
                <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", margin: 0 }}>
                    {t("title")}...
                </p>
            )}

            {!isLoading && debounced.length === 0 && (
                <Card>
                    <CardContent
                        style={{
                            padding: "64px 16px",
                            textAlign: "center",
                            color: "var(--color-text-secondary)",
                        }}
                    >
                        <SearchIcon size={40} style={{ marginBottom: "16px", opacity: 0.3 }} />
                        <p style={{ margin: 0, fontSize: "14px" }}>{t("searchHint")}</p>
                    </CardContent>
                </Card>
            )}

            {!isLoading && debounced.length > 0 && results.length === 0 && (
                <Card>
                    <CardContent style={{ padding: "48px 16px", textAlign: "center" }}>
                        <p
                            style={{
                                margin: 0,
                                fontSize: "14px",
                                color: "var(--color-text-secondary)",
                            }}
                        >
                            {t("noResults")}
                        </p>
                    </CardContent>
                </Card>
            )}

            {!isLoading && results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <p
                        style={{
                            fontSize: "13px",
                            color: "var(--color-text-secondary)",
                            margin: 0,
                        }}
                    >
                        {t("resultsFor", { query: debounced })}
                    </p>
                    {Object.entries(grouped).map(([type, items]) => (
                        <div key={type}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    marginBottom: "8px",
                                }}
                            >
                                <h3
                                    style={{
                                        fontSize: "14px",
                                        fontWeight: 600,
                                        margin: 0,
                                        color: "var(--color-text)",
                                        textTransform: "capitalize",
                                    }}
                                >
                                    {typeLabel(type)}
                                </h3>
                                <span
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    ({items.length})
                                </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                {items.map((item) => (
                                    <Link
                                        key={`${item.type}-${item.id}`}
                                        href={item.url}
                                        style={{ textDecoration: "none" }}
                                    >
                                        <Card>
                                            <CardContent
                                                style={{
                                                    padding: "10px 12px",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "10px",
                                                }}
                                            >
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            fontSize: "14px",
                                                            fontWeight: 600,
                                                            color: "var(--color-text)",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {item.title}
                                                    </div>
                                                    {item.snippet && (
                                                        <div
                                                            style={{
                                                                fontSize: "13px",
                                                                color: "var(--color-text-secondary)",
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                                marginTop: "2px",
                                                            }}
                                                        >
                                                            {item.snippet}
                                                        </div>
                                                    )}
                                                </div>
                                                <ExternalLink
                                                    size={14}
                                                    color="var(--color-text-secondary)"
                                                    style={{ flexShrink: 0 }}
                                                />
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
