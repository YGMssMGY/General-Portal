"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Eye, EyeOff, Settings2 } from "lucide-react";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WidgetCard } from "@/components/widgets/WidgetCard";
import { WIDGET_ICONS, WIDGET_IDS, type WidgetId } from "@/components/widgets/widgetCatalog";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { fetchJson } from "@/lib/api-client";

interface WidgetData {
    items: unknown[];
    total: number;
}

type MyWorkData = Record<WidgetId, WidgetData>;

interface Prefs {
    widgets: string[];
    theme: string;
    density: string;
}

function isWidgetId(value: string): value is WidgetId {
    return (WIDGET_IDS as readonly string[]).includes(value);
}

export default function MyWorkPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const { status } = useAuthSession();
    const t = useTranslations("myWork");
    const tC = useTranslations("common");
    const tE = useTranslations("errors");
    const queryClient = useQueryClient();
    const [customizing, setCustomizing] = useState(false);
    usePageTitle(`${t("title")} | ${workspace?.name ?? portal}`);

    const { data, isLoading, isError, refetch } = useQuery<MyWorkData>({
        queryKey: [portal, "my-work"],
        queryFn: () => fetchJson<MyWorkData>("/api/my-work"),
        enabled: portal !== "",
    });

    const { data: prefs } = useQuery<Prefs>({
        queryKey: [portal, "prefs"],
        queryFn: () => fetchJson<Prefs>("/api/me/prefs"),
        enabled: portal !== "",
    });

    const prefsMutation = useMutation({
        mutationFn: (widgets: WidgetId[]) =>
            fetchJson<Prefs>("/api/me/prefs", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ widgets }),
            }),
        onSuccess: (next) => {
            queryClient.setQueryData([portal, "prefs"], next);
        },
    });

    const labels: Record<WidgetId, string> = {
        tasks: t("widget.tasks"),
        events: t("widget.events"),
        proposals: t("widget.proposals"),
        approvals: t("widget.approvals"),
        dues: t("widget.dues"),
        polls: t("widget.polls"),
        rsvps: t("widget.rsvps"),
        kudos: t("widget.kudos"),
    };

    const stored = (prefs?.widgets ?? []).filter(isWidgetId);
    const visible: WidgetId[] = stored.length > 0 ? [...new Set(stored)] : [...WIDGET_IDS];
    const ordered: WidgetId[] = [...visible, ...WIDGET_IDS.filter((id) => !visible.includes(id))];
    const visibleSet = new Set(visible);

    function widgetHref(id: WidgetId): string {
        return `/${portal}/${id === "rsvps" ? "meetings" : id}`;
    }

    function toggleWidget(id: WidgetId) {
        const next = visibleSet.has(id)
            ? visible.filter((widget) => widget !== id)
            : ordered.filter((widget) => visibleSet.has(widget) || widget === id);
        if (next.length === 0) return;
        prefsMutation.mutate(next);
    }

    function moveWidget(id: WidgetId, dir: -1 | 1) {
        const index = ordered.indexOf(id);
        const target = index + dir;
        if (index < 0 || target < 0 || target >= ordered.length) return;
        const next = [...ordered];
        const current = next[index];
        next[index] = next[target];
        next[target] = current;
        prefsMutation.mutate(next);
    }

    if (status === "unauthenticated") {
        return (
            <div className="p-6 text-sm text-[var(--color-destructive)]">{tE("unauthorized")}</div>
        );
    }

    if (status === "loading" || isLoading || !data) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {WIDGET_IDS.map((id) => (
                        <Skeleton key={id} className="h-32" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
                <p className="text-sm text-[var(--color-destructive)]">{tE("internal")}</p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                    {tC("retry")}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            <header className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-xl font-semibold text-[var(--color-text)]">{t("title")}</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">{t("subtitle")}</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomizing((value) => !value)}
                    aria-expanded={customizing}
                >
                    <Settings2 size={16} />
                    {customizing ? t("done") : t("customize")}
                </Button>
            </header>

            {customizing ? (
                <div className="flex flex-col gap-2 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                    {ordered.map((id, index) => {
                        const shown = visibleSet.has(id);
                        return (
                            <div key={id} className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => toggleWidget(id)}
                                    aria-label={shown ? t("hide") : t("show")}
                                >
                                    {shown ? <EyeOff size={16} /> : <Eye size={16} />}
                                </Button>
                                <span className="flex-1 text-sm text-[var(--color-text)]">
                                    {labels[id]}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveWidget(id, -1)}
                                    disabled={index === 0}
                                    aria-label={t("moveUp")}
                                >
                                    <ArrowUp size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => moveWidget(id, 1)}
                                    disabled={index === ordered.length - 1}
                                    aria-label={t("moveDown")}
                                >
                                    <ArrowDown size={16} />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ordered
                    .filter((id) => visibleSet.has(id) && data[id])
                    .map((id) => (
                        <WidgetCard
                            key={id}
                            id={id}
                            title={labels[id]}
                            count={data[id].total}
                            href={widgetHref(id)}
                            icon={WIDGET_ICONS[id]}
                        />
                    ))}
            </div>
        </div>
    );
}
