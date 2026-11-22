"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { fetchJson } from "@/lib/api-client";

interface AnalyticsResponse {
    range: number;
    series: {
        tasks: Array<{ week: string; created: number; completed: number }>;
        events: Array<{ week: string; count: number }>;
        members: Array<{ week: string; count: number; cumulative: number }>;
        finance: Array<{ week: string; income: number; expense: number; net: number }>;
    };
    totals: {
        tasksCreated: number;
        tasksCompleted: number;
        events: number;
        members: number;
        participationScore: number;
        participants: number;
        incomeCents: number;
        expenseCents: number;
        netCents: number;
        attendanceTotal: number;
        attendancePresent: number;
        attendanceRate: number;
    };
}

const CHART_AXIS = { fontSize: 11 };

export default function AnalyticsPage() {
    const t = useTranslations("analytics");
    const te = useTranslations("errors");
    const portal = usePortal();
    const { user } = useAuthSession();
    const { data: workspace } = useWorkspace();
    usePageTitle(t("title"));
    const locale = user?.locale || undefined;
    const wsName = workspace?.name ?? portal;
    const [range, setRange] = useState("30");

    const { data, isLoading, isError, error } = useQuery<AnalyticsResponse>({
        queryKey: [portal, "analytics", range],
        queryFn: () => fetchJson<AnalyticsResponse>(`/api/analytics?range=${range}`),
        enabled: portal !== "",
    });

    function formatCents(value: number): string {
        return `${value.toLocaleString(locale)} ${t("cents")}`;
    }

    const totals = data?.totals;
    const series = data?.series;
    const errorMessage = error instanceof Error ? error.message : "";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
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
                        {t("title")}
                    </h1>
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            margin: "4px 0 0",
                        }}
                    >
                        {wsName}
                    </p>
                </div>
                <Select value={range} onValueChange={setRange}>
                    <SelectTrigger style={{ width: "160px" }}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="30">{t("range30")}</SelectItem>
                        <SelectItem value="90">{t("range90")}</SelectItem>
                        <SelectItem value="365">{t("range365")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isError ? (
                <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
                    {errorMessage.includes("403") ? te("forbidden") : te("internal")}
                </p>
            ) : (
                <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("tasksCreated")}
                                </p>
                                {isLoading ? (
                                    <Skeleton className="h-7 w-20" />
                                ) : (
                                    <p
                                        style={{
                                            fontSize: "20px",
                                            fontWeight: 700,
                                            color: "var(--color-text)",
                                            margin: 0,
                                        }}
                                    >
                                        {totals?.tasksCreated ?? 0}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("tasksCompleted")}
                                </p>
                                {isLoading ? (
                                    <Skeleton className="h-7 w-20" />
                                ) : (
                                    <p
                                        style={{
                                            fontSize: "20px",
                                            fontWeight: 700,
                                            color: "var(--color-text)",
                                            margin: 0,
                                        }}
                                    >
                                        {totals?.tasksCompleted ?? 0}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("events")}
                                </p>
                                {isLoading ? (
                                    <Skeleton className="h-7 w-20" />
                                ) : (
                                    <p
                                        style={{
                                            fontSize: "20px",
                                            fontWeight: 700,
                                            color: "var(--color-text)",
                                            margin: 0,
                                        }}
                                    >
                                        {totals?.events ?? 0}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("members")}
                                </p>
                                {isLoading ? (
                                    <Skeleton className="h-7 w-20" />
                                ) : (
                                    <p
                                        style={{
                                            fontSize: "20px",
                                            fontWeight: 700,
                                            color: "var(--color-text)",
                                            margin: 0,
                                        }}
                                    >
                                        {totals?.members ?? 0}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("participation")}
                                </p>
                                {isLoading ? (
                                    <Skeleton className="h-7 w-20" />
                                ) : (
                                    <p
                                        style={{
                                            fontSize: "20px",
                                            fontWeight: 700,
                                            color: "var(--color-text)",
                                            margin: 0,
                                        }}
                                    >
                                        {totals?.participationScore ?? 0}
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("attendanceRate")}
                                </p>
                                {isLoading ? (
                                    <Skeleton className="h-7 w-20" />
                                ) : (
                                    <p
                                        style={{
                                            fontSize: "20px",
                                            fontWeight: 700,
                                            color: "var(--color-text)",
                                            margin: 0,
                                        }}
                                    >
                                        {((totals?.attendanceRate ?? 0) * 100).toFixed(1)}%
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card>
                            <CardContent style={{ padding: "20px" }}>
                                <h2
                                    style={{
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                        margin: "0 0 12px",
                                    }}
                                >
                                    {t("tasksTrend")}
                                </h2>
                                {isLoading ? (
                                    <Skeleton className="h-60 w-full" />
                                ) : (series?.tasks.length ?? 0) === 0 ? (
                                    <p
                                        style={{
                                            fontSize: "14px",
                                            color: "var(--color-text-secondary)",
                                            margin: 0,
                                        }}
                                    >
                                        {t("noData")}
                                    </p>
                                ) : (
                                    <div style={{ height: "240px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={series?.tasks ?? []}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="week" tick={CHART_AXIS} />
                                                <YAxis tick={CHART_AXIS} />
                                                <Tooltip />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="created"
                                                    name={t("created")}
                                                    stroke="var(--color-primary)"
                                                    dot={false}
                                                />
                                                <Line
                                                    type="monotone"
                                                    dataKey="completed"
                                                    name={t("completed")}
                                                    stroke="var(--color-success)"
                                                    dot={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent style={{ padding: "20px" }}>
                                <h2
                                    style={{
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                        margin: "0 0 12px",
                                    }}
                                >
                                    {t("eventsTrend")}
                                </h2>
                                {isLoading ? (
                                    <Skeleton className="h-60 w-full" />
                                ) : (series?.events.length ?? 0) === 0 ? (
                                    <p
                                        style={{
                                            fontSize: "14px",
                                            color: "var(--color-text-secondary)",
                                            margin: 0,
                                        }}
                                    >
                                        {t("noData")}
                                    </p>
                                ) : (
                                    <div style={{ height: "240px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={series?.events ?? []}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="week" tick={CHART_AXIS} />
                                                <YAxis tick={CHART_AXIS} />
                                                <Tooltip />
                                                <Bar
                                                    dataKey="count"
                                                    name={t("events")}
                                                    fill="var(--color-primary)"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent style={{ padding: "20px" }}>
                                <h2
                                    style={{
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                        margin: "0 0 12px",
                                    }}
                                >
                                    {t("membersTrend")}
                                </h2>
                                {isLoading ? (
                                    <Skeleton className="h-60 w-full" />
                                ) : (series?.members.length ?? 0) === 0 ? (
                                    <p
                                        style={{
                                            fontSize: "14px",
                                            color: "var(--color-text-secondary)",
                                            margin: 0,
                                        }}
                                    >
                                        {t("noData")}
                                    </p>
                                ) : (
                                    <div style={{ height: "240px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={series?.members ?? []}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="week" tick={CHART_AXIS} />
                                                <YAxis tick={CHART_AXIS} />
                                                <Tooltip />
                                                <Line
                                                    type="monotone"
                                                    dataKey="cumulative"
                                                    name={t("members")}
                                                    stroke="var(--color-primary)"
                                                    dot={false}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent style={{ padding: "20px" }}>
                                <h2
                                    style={{
                                        fontSize: "15px",
                                        fontWeight: 600,
                                        color: "var(--color-text)",
                                        margin: "0 0 12px",
                                    }}
                                >
                                    {t("financeTrend")}
                                </h2>
                                {isLoading ? (
                                    <Skeleton className="h-60 w-full" />
                                ) : (series?.finance.length ?? 0) === 0 ? (
                                    <p
                                        style={{
                                            fontSize: "14px",
                                            color: "var(--color-text-secondary)",
                                            margin: 0,
                                        }}
                                    >
                                        {t("noData")}
                                    </p>
                                ) : (
                                    <div style={{ height: "240px" }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={series?.finance ?? []}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="week" tick={CHART_AXIS} />
                                                <YAxis tick={CHART_AXIS} />
                                                <Tooltip
                                                    formatter={(v) => [formatCents(Number(v)), ""]}
                                                />
                                                <Legend />
                                                <Bar
                                                    dataKey="income"
                                                    name={t("income")}
                                                    fill="var(--color-success)"
                                                />
                                                <Bar
                                                    dataKey="expense"
                                                    name={t("expense")}
                                                    fill="var(--color-destructive)"
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("income")}
                                </p>
                                <p
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: "var(--color-success)",
                                        margin: 0,
                                    }}
                                >
                                    {formatCents(totals?.incomeCents ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("expense")}
                                </p>
                                <p
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: "var(--color-destructive)",
                                        margin: 0,
                                    }}
                                >
                                    {formatCents(totals?.expenseCents ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent style={{ padding: "16px 20px" }}>
                                <p
                                    style={{
                                        fontSize: "12px",
                                        color: "var(--color-text-secondary)",
                                        margin: "0 0 4px",
                                    }}
                                >
                                    {t("net")}
                                </p>
                                <p
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: 700,
                                        color: "var(--color-text)",
                                        margin: 0,
                                    }}
                                >
                                    {formatCents(totals?.netCents ?? 0)}
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
