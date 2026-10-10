"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatDateKey, getMonthGrid, getMonthName } from "@/lib/calendar-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface CalEvent {
    id: string;
    title: string;
    startDate: string;
    endDate: string | null;
    location: string | null;
    status: string;
}

interface CalTask {
    id: string;
    title: string;
    dueDate: string | null;
    status: string;
    priority: number;
}

interface CalMeeting {
    id: string;
    title: string;
    startTime: string;
    endTime: string | null;
    location: string | null;
}

interface CalSlot {
    id: string;
    title: string;
    startTime: string;
    endTime: string | null;
}

interface CalendarResponse {
    events: CalEvent[];
    tasks: CalTask[];
    meetings: CalMeeting[];
    slots: CalSlot[];
}

interface DayItem {
    id: string;
    title: string;
    kind: "event" | "task" | "meeting" | "slot";
    route: string;
}

const KIND_COLORS: Record<DayItem["kind"], string> = {
    event: "var(--color-primary)",
    task: "#c48200",
    meeting: "var(--color-success)",
    slot: "var(--color-warning)",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKeyOf(d: Date): string {
    return formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CalendarPage() {
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const tNav = useTranslations("nav");
    const tCommon = useTranslations("common");
    const tErrors = useTranslations("errors");
    const tTasks = useTranslations("tasks");
    const tEvents = useTranslations("events");
    usePageTitle(`${tNav("calendar")} | ${workspace?.name ?? portal}`);
    const router = useRouter();

    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());

    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const { data, isLoading, isError, refetch } = useQuery<CalendarResponse>({
        queryKey: [portal, "calendar", year, month],
        queryFn: () =>
            fetchJson<CalendarResponse>(
                `/api/calendar?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`,
            ),
        enabled: portal !== "",
    });

    const itemsByDate = new Map<string, DayItem[]>();
    function push(dateStr: string | null, item: DayItem) {
        if (!dateStr) return;
        const key = dateKeyOf(new Date(dateStr));
        const list = itemsByDate.get(key) ?? [];
        list.push(item);
        itemsByDate.set(key, list);
    }
    for (const e of data?.events ?? []) {
        push(e.startDate, { id: e.id, title: e.title, kind: "event", route: "/events" });
    }
    for (const task of data?.tasks ?? []) {
        push(task.dueDate, { id: task.id, title: task.title, kind: "task", route: "/tasks" });
    }
    for (const m of data?.meetings ?? []) {
        push(m.startTime, { id: m.id, title: m.title, kind: "meeting", route: "/meetings" });
    }
    for (const s of data?.slots ?? []) {
        push(s.startTime, { id: s.id, title: s.title, kind: "slot", route: "/volunteers" });
    }

    const weeks = getMonthGrid(year, month);

    function prevMonth() {
        if (month === 0) {
            setYear(year - 1);
            setMonth(11);
        } else {
            setMonth(month - 1);
        }
    }

    function nextMonth() {
        if (month === 11) {
            setYear(year + 1);
            setMonth(0);
        } else {
            setMonth(month + 1);
        }
    }

    function kindLabel(kind: DayItem["kind"]): string {
        if (kind === "event") return tEvents("title");
        if (kind === "task") return tTasks("singular");
        if (kind === "meeting") return tNav("meetings");
        return tNav("volunteers");
    }

    const totalItems =
        (data?.events.length ?? 0) +
        (data?.tasks.length ?? 0) +
        (data?.meetings.length ?? 0) +
        (data?.slots.length ?? 0);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "1200px" }}>
            <div>
                <h1
                    style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "var(--color-text)",
                        margin: 0,
                    }}
                >
                    {tNav("calendar")}
                </h1>
                <p
                    style={{
                        fontSize: "14px",
                        color: "var(--color-text-secondary)",
                        margin: "4px 0 0",
                    }}
                >
                    {tEvents("title")} &middot; {tTasks("plural")} &middot; {tNav("meetings")}{" "}
                    &middot; {tNav("volunteers")}
                </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={prevMonth}
                    aria-label={tCommon("previous")}
                >
                    <ChevronLeft size={16} />
                </Button>
                <span style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-text)" }}>
                    {getMonthName(month)} {year}
                </span>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={nextMonth}
                    aria-label={tCommon("next")}
                >
                    <ChevronRight size={16} />
                </Button>
            </div>

            {isLoading && (
                <Card>
                    <CardContent style={{ padding: "16px" }}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(7, 1fr)",
                                gap: "4px",
                            }}
                        >
                            {Array.from({ length: 35 }).map((_, i) => (
                                <Skeleton key={i} style={{ height: "80px" }} />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {isError && (
                <Card>
                    <CardContent style={{ padding: "40px 20px", textAlign: "center" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-destructive)",
                                margin: "0 0 16px",
                            }}
                        >
                            {tErrors("internal")}
                        </p>
                        <Button variant="outline" onClick={() => refetch()}>
                            {tCommon("retry")}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!isLoading && !isError && (
                <Card>
                    <CardContent style={{ padding: "0", overflow: "hidden" }}>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(7, 1fr)",
                                backgroundColor: "var(--color-border)",
                                gap: "1px",
                            }}
                        >
                            {DAY_NAMES.map((name) => (
                                <div
                                    key={name}
                                    style={{
                                        padding: "10px 4px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        textAlign: "center",
                                        color: "var(--color-text-secondary)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.05em",
                                        backgroundColor: "var(--color-bg)",
                                    }}
                                >
                                    {name}
                                </div>
                            ))}
                            {weeks.map((week, wi) =>
                                week.map((day, di) => {
                                    if (day === null) {
                                        return (
                                            <div
                                                key={`empty-${wi}-${di}`}
                                                style={{
                                                    backgroundColor: "var(--color-bg)",
                                                    minHeight: "100px",
                                                }}
                                            />
                                        );
                                    }
                                    const key = formatDateKey(year, month, day);
                                    const dayItems = itemsByDate.get(key) ?? [];
                                    const isToday =
                                        today.getFullYear() === year &&
                                        today.getMonth() === month &&
                                        today.getDate() === day;
                                    return (
                                        <div
                                            key={key}
                                            style={{
                                                backgroundColor: "var(--color-bg)",
                                                padding: "6px",
                                                minHeight: "100px",
                                                display: "flex",
                                                flexDirection: "column",
                                                gap: "3px",
                                                border: isToday
                                                    ? "2px solid var(--color-primary)"
                                                    : "2px solid transparent",
                                                borderRadius: isToday ? "5px" : "0",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    fontWeight: isToday ? 700 : 500,
                                                    color: isToday
                                                        ? "var(--color-primary)"
                                                        : "var(--color-text)",
                                                    padding: "2px 4px",
                                                }}
                                            >
                                                {day}
                                            </span>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "3px",
                                                    flex: 1,
                                                }}
                                            >
                                                {dayItems.slice(0, 4).map((item) => (
                                                    <button
                                                        key={`${item.kind}-${item.id}`}
                                                        type="button"
                                                        onClick={() =>
                                                            router.push(`/${portal}${item.route}`)
                                                        }
                                                        title={`${item.title} (${kindLabel(item.kind)})`}
                                                        style={{
                                                            display: "block",
                                                            width: "100%",
                                                            padding: "4px 6px",
                                                            border: "none",
                                                            borderRadius: "4px",
                                                            fontSize: "11px",
                                                            fontWeight: 600,
                                                            textAlign: "left",
                                                            cursor: "pointer",
                                                            fontFamily: "inherit",
                                                            color: "#fff",
                                                            backgroundColor: KIND_COLORS[item.kind],
                                                            lineHeight: 1.3,
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                            whiteSpace: "nowrap",
                                                        }}
                                                    >
                                                        {item.title}
                                                    </button>
                                                ))}
                                                {dayItems.length > 4 && (
                                                    <span
                                                        style={{
                                                            fontSize: "10px",
                                                            fontWeight: 600,
                                                            color: "var(--color-text-secondary)",
                                                            padding: "2px 4px",
                                                        }}
                                                    >
                                                        +{dayItems.length - 4} {tCommon("more")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }),
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {!isLoading && !isError && totalItems === 0 && (
                <EmptyState
                    icon={<CalendarIcon size={24} />}
                    title={tCommon("none")}
                    description={tEvents("noEvents")}
                />
            )}

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                }}
            >
                {(Object.keys(KIND_COLORS) as DayItem["kind"][]).map((kind) => (
                    <div key={kind} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                            style={{
                                display: "inline-block",
                                width: "10px",
                                height: "10px",
                                borderRadius: "2px",
                                backgroundColor: KIND_COLORS[kind],
                            }}
                        />
                        {kindLabel(kind)}
                    </div>
                ))}
            </div>
        </div>
    );
}
