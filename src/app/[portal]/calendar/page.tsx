"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";
import { fetchJson } from "@/lib/api-client";
import { formatDateKey, getMonthGrid, getMonthName } from "@/lib/calendar-utils";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CalendarItem {
  id: string;
  title: string;
  date: string;
  type: "event" | "deadline" | "meeting" | "volunteer";
  entityId: string;
}

interface CalendarResponse {
  items: CalendarItem[];
  month: number;
  year: number;
}

const TYPE_STYLES: Record<string, { bg: string }> = {
  event: { bg: "var(--color-primary)" },
  deadline: { bg: "#c48200" },
  meeting: { bg: "var(--color-success)" },
  volunteer: { bg: "var(--color-warning)" },
};

const TYPE_LABELS: Record<string, string> = {
  event: "Event",
  deadline: "Deadline",
  meeting: "Meeting",
  volunteer: "Volunteer",
};

const TYPE_ROUTES: Record<string, string> = {
  event: "/events",
  deadline: "/tasks",
  meeting: "/meetings",
  volunteer: "/volunteers",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const portal = usePortal();
  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";
  usePageTitle(`Calendar | ${portalName}`);
  const router = useRouter();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const queryKey = [portal, "calendar-page", year, month];
  const { data, isLoading, isError } = useQuery<CalendarResponse>({
    queryKey,
    queryFn: () =>
      fetchJson<CalendarResponse>(`/api/calendar?month=${month}&year=${year}`),
  });

  const itemsByDate = new Map<string, CalendarItem[]>();
  if (data?.items) {
    for (const item of data.items) {
      const d = new Date(item.date);
      const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
      if (!itemsByDate.has(key)) itemsByDate.set(key, []);
      itemsByDate.get(key)!.push(item);
    }
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

  function handleItemClick(item: CalendarItem) {
    const route = TYPE_ROUTES[item.type] ?? "/events";
    router.push(`/${portal}${route}`);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        maxWidth: "1200px",
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
          Calendar
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            margin: "4px 0 0",
          }}
        >
          All scheduled items across your portal
        </p>
      </div>

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          type="button"
          onClick={prevMonth}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            border: "1px solid var(--color-border)",
            borderRadius: "5px",
            background: "var(--color-bg)",
            cursor: "pointer",
            color: "var(--color-text)",
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--color-text)",
          }}
        >
          {getMonthName(month)} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            border: "1px solid var(--color-border)",
            borderRadius: "5px",
            background: "var(--color-bg)",
            cursor: "pointer",
            color: "var(--color-text)",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent style={{ padding: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: "4px",
                }}
              >
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    style={{ height: "80px", borderRadius: "5px" }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <CardContent
            style={{
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-destructive)",
                margin: 0,
              }}
            >
              Failed to load calendar data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loaded state */}
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
              {/* Day name headers */}
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

              {/* Day cells */}
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
                        {dayItems.map((item) => {
                          const typeStyle = TYPE_STYLES[item.type] ?? TYPE_STYLES.event;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleItemClick(item)}
                              title={`${item.title} (${TYPE_LABELS[item.type] ?? item.type})`}
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
                                backgroundColor: typeStyle.bg,
                                lineHeight: 1.3,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item.title}
                            </button>
                          );
                        })}
                        {dayItems.length > 4 && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 600,
                              color: "var(--color-text-secondary)",
                              padding: "2px 4px",
                            }}
                          >
                            +{dayItems.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data?.items && data.items.length === 0 && (
        <Card>
          <CardContent
            style={{
              padding: "40px 20px",
              textAlign: "center",
            }}
          >
            <CalendarIcon
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
              No items this month
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              Try browsing another month.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
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
        {Object.entries(TYPE_STYLES).map(([type, style]) => (
          <div
            key={type}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "2px",
                backgroundColor: style.bg,
              }}
            />
            {TYPE_LABELS[type] ?? type}
          </div>
        ))}
      </div>
    </div>
  );
}
