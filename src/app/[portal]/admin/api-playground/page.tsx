"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuthSession } from "@/components/AuthSessionProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePageTitle } from "@/hooks/usePageTitle";
import { fetchJson } from "@/lib/api-client";

const ALLOWED = [
    { method: "GET", path: "/api/tasks" },
    { method: "GET", path: "/api/events" },
    { method: "GET", path: "/api/proposals" },
    { method: "GET", path: "/api/members" },
    { method: "GET", path: "/api/dashboard" },
    { method: "GET", path: "/api/health" },
] as const;

export default function ApiPlaygroundPage() {
    const t = useTranslations("apiPlayground");
    const te = useTranslations("errors");
    const { user } = useAuthSession();
    usePageTitle(t("title"));
    const canManage = user?.permissions.includes("manage_api_tokens") ?? false;
    const [method, setMethod] = useState("GET");
    const [path, setPath] = useState<string>(ALLOWED[0].path);
    const [body, setBody] = useState("");
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const allowed = ALLOWED.some((entry) => entry.method === method && entry.path === path);

    async function execute() {
        if (!allowed) return;
        setBusy(true);
        setError(null);
        setResult(null);
        let url = path;
        const trimmed = body.trim();
        if (trimmed) {
            let parsed: unknown;
            try {
                parsed = JSON.parse(trimmed);
            } catch {
                setError(te("badRequest"));
                setBusy(false);
                return;
            }
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                const params = new URLSearchParams();
                for (const [key, value] of Object.entries(parsed)) {
                    if (value === null || value === undefined || typeof value === "object")
                        continue;
                    params.set(key, String(value));
                }
                const qs = params.toString();
                if (qs) url = `${path}?${qs}`;
            }
        }
        try {
            const data = await fetchJson<unknown>(url, { method });
            setResult(JSON.stringify(data, null, 2));
        } catch (e) {
            setError(e instanceof Error ? e.message : te("internal"));
        } finally {
            setBusy(false);
        }
    }

    if (!canManage) {
        return (
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                {te("forbidden")}
            </p>
        );
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            <Card>
                <CardContent
                    style={{
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px",
                    }}
                >
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <div>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "12px",
                                    color: "var(--color-text-secondary)",
                                    marginBottom: "6px",
                                }}
                            >
                                {t("method")}
                            </label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger style={{ width: "120px" }}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div style={{ flex: 1, minWidth: "240px" }}>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "12px",
                                    color: "var(--color-text-secondary)",
                                    marginBottom: "6px",
                                }}
                            >
                                {t("endpoint")}
                            </label>
                            <Select value={path} onValueChange={setPath}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ALLOWED.filter((entry) => entry.method === method).map(
                                        (entry) => (
                                            <SelectItem key={entry.path} value={entry.path}>
                                                {entry.method} {entry.path}
                                            </SelectItem>
                                        ),
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <label
                            style={{
                                display: "block",
                                fontSize: "12px",
                                color: "var(--color-text-secondary)",
                                marginBottom: "6px",
                            }}
                        >
                            {t("body")}
                        </label>
                        <Textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder={t("bodyHint")}
                            rows={4}
                        />
                    </div>
                    <div>
                        <Button onClick={execute} disabled={busy || !allowed}>
                            {busy ? t("running") : t("send")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            {error && (
                <p style={{ fontSize: "14px", color: "var(--color-destructive)", margin: 0 }}>
                    {error}
                </p>
            )}
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
                        {t("response")}
                    </h2>
                    {result === null ? (
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {t("empty")}
                        </p>
                    ) : (
                        <pre
                            style={{
                                margin: 0,
                                padding: "12px",
                                overflowX: "auto",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--color-bg-secondary)",
                                color: "var(--color-text)",
                                fontSize: "12px",
                            }}
                        >
                            {result}
                        </pre>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
