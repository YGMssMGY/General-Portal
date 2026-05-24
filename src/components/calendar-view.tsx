"use client";

import { useState } from "react";
import { formatDateKey, getMonthGrid, getMonthName } from "@/lib/calendar-utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarItem {
  id: string;
  title: string;
  date: string;
  type: "event" | "deadline" | "meeting";
  portal: string;
  entityId: string;
}

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  event: { bg: "var(--color-primary)", text: "#fff", border: "var(--color-primary)" },
  deadline: { bg: "#c48200", text: "#fff", border: "#c48200" },
  meeting: { bg: "var(--color-success)", text: "#fff", border: "var(--color-success)" },
};

interface CalendarViewProps {
  items: CalendarItem[];
  onItemClick?: (item: CalendarItem) => void;
}

export default function CalendarView({ items, onItemClick }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

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

  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const d = new Date(item.date);
    const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!itemsByDate.has(key)) itemsByDate.set(key, []);
    itemsByDate.get(key)!.push(item);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
            fontSize: "16px",
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "1px",
          background: "var(--color-border)",
          borderRadius: "5px",
          overflow: "hidden",
        }}
      >
        {dayNames.map((name) => (
          <div
            key={name}
            style={{
              padding: "8px 4px",
              fontSize: "11px",
              fontWeight: 600,
              textAlign: "center",
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              background: "var(--color-bg)",
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
                    background: "var(--color-bg)",
                    minHeight: "80px",
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
                  background: "var(--color-bg)",
                  padding: "4px",
                  minHeight: "80px",
                  border: isToday ? "2px solid var(--color-primary)" : "none",
                  borderRadius: isToday ? "5px" : "0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "var(--color-primary)" : "var(--color-text)",
                    padding: "2px 4px",
                  }}
                >
                  {day}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
                  {dayItems.slice(0, 4).map((item) => {
                    const s = TYPE_STYLES[item.type] ?? TYPE_STYLES.event;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onItemClick?.(item)}
                        title={item.title}
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
                          color: s.text,
                          background: s.bg,
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
          }),
        )}
      </div>
    </div>
  );
}
