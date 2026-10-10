"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchJson } from "@/lib/api-client";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { usePageTitle } from "@/hooks/usePageTitle";

interface Breakdown {
    taskCount: number;
    taskPoints: number;
    eventCount: number;
    eventPoints: number;
    rsvpCount: number;
    rsvpPoints: number;
    volunteerHours: number;
    volunteerPoints: number;
    kudosCount: number;
    kudosPoints: number;
}

interface ScoreResult {
    score: number;
    breakdown: Breakdown;
    rank: number;
    period: string;
    periodType: string;
    userId: string;
}

interface LeaderboardRow {
    id: string;
    userId: string;
    score: number;
    breakdown: Breakdown;
    user: { id: string; name: string | null; email: string; image: string | null } | null;
}

function currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    backgroundColor: "var(--color-bg)",
    color: "var(--color-text)",
    fontFamily: "inherit",
    outline: "none",
};

const cardStyle: React.CSSProperties = {
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    padding: "16px",
    backgroundColor: "var(--color-bg)",
    marginBottom: "20px",
};

function ParticipationContent() {
    const t = useTranslations("participation");
    const tc = useTranslations("common");
    const portal = usePortal();
    usePageTitle(t("title"));
    const [period, setPeriod] = useState(currentPeriod());
    const [periodType, setPeriodType] = useState("month");

    const qs = `period=${encodeURIComponent(period)}&periodType=${encodeURIComponent(periodType)}`;
    const { data: mine, isLoading } = useQuery<ScoreResult>({
        queryKey: [portal, "participation", "mine", period, periodType],
        queryFn: () => fetchJson<ScoreResult>(`/api/participation?${qs}`),
        enabled: /^\d{4}-(0[1-9]|1[0-2])$/.test(period),
    });
    const { data: board } = useQuery<LeaderboardRow[]>({
        queryKey: [portal, "participation", "leaderboard", period, periodType],
        queryFn: () => fetchJson<LeaderboardRow[]>(`/api/participation/leaderboard?${qs}`),
        enabled: /^\d{4}-(0[1-9]|1[0-2])$/.test(period),
    });

    const b = mine?.breakdown;
    const chartData = b
        ? [
              { name: "tasks", points: b.taskPoints },
              { name: "events", points: b.eventPoints },
              { name: "rsvp", points: b.rsvpPoints },
              { name: "volunteer", points: b.volunteerPoints },
              { name: "kudos", points: b.kudosPoints },
          ]
        : [];

    return (
        <div>
            <h1
                style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    margin: "0 0 20px",
                    color: "var(--color-text)",
                }}
            >
                {t("title")}
            </h1>
            <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                <input
                    style={inputStyle}
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="YYYY-MM"
                />
                <select
                    style={inputStyle}
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value)}
                >
                    <option value="month">{t("periodMonth")}</option>
                    <option value="term">{t("periodTerm")}</option>
                    <option value="year">{t("periodYear")}</option>
                </select>
            </div>
            {isLoading ? (
                <div style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                    {tc("loading")}
                </div>
            ) : !mine || !b ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noData")}
                </p>
            ) : (
                <div style={cardStyle}>
                    <div
                        style={{
                            display: "flex",
                            gap: "24px",
                            alignItems: "baseline",
                            marginBottom: "12px",
                            flexWrap: "wrap",
                        }}
                    >
                        <span
                            style={{
                                fontSize: "28px",
                                fontWeight: 700,
                                color: "var(--color-text)",
                            }}
                        >
                            {mine.score}
                        </span>
                        <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                            {t("score")}
                        </span>
                        <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                            {t("rank")}: {mine.rank}
                        </span>
                    </div>
                    <div style={{ width: "100%", height: "220px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="points" fill="var(--color-primary)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <ul
                        style={{
                            listStyle: "none",
                            margin: "12px 0 0",
                            padding: 0,
                            fontSize: "14px",
                            color: "var(--color-text)",
                        }}
                    >
                        <li>{t("tasksCompleted", { count: b.taskCount })}</li>
                        <li>{t("eventsAttended", { count: b.eventCount })}</li>
                        <li>{t("rsvpsGiven", { count: b.rsvpCount })}</li>
                        <li>{t("volunteerHours", { count: b.volunteerHours })}</li>
                        <li>
                            {t("kudosReceived")}: {b.kudosCount}
                        </li>
                    </ul>
                </div>
            )}
            <h2
                style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    margin: "0 0 12px",
                    color: "var(--color-text)",
                }}
            >
                {t("leaderboard")}
            </h2>
            {(board ?? []).length === 0 ? (
                <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                    {t("noData")}
                </p>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead>
                            <tr style={{ textAlign: "left", color: "var(--color-text-secondary)" }}>
                                <th style={{ padding: "8px" }}>{t("rank")}</th>
                                <th style={{ padding: "8px" }}>{tc("name")}</th>
                                <th style={{ padding: "8px" }}>{t("score")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(board ?? []).map((row, i) => (
                                <tr
                                    key={row.id}
                                    style={{ borderTop: "1px solid var(--color-border)" }}
                                >
                                    <td style={{ padding: "8px" }}>{i + 1}</td>
                                    <td style={{ padding: "8px" }}>
                                        {row.user?.name ?? row.user?.email ?? tc("unknown")}
                                    </td>
                                    <td style={{ padding: "8px" }}>{row.score}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function ParticipationPage() {
    return (
        <AuthSessionProvider>
            <ParticipationContent />
        </AuthSessionProvider>
    );
}
