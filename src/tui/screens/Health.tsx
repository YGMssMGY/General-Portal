import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { pendingMigrations, withClient } from "../lib/tui-db.js";
import { listPortalSlugs, portalDbUrl } from "../../db/client.js";

interface Row {
    slug: string;
    size: string;
    sessions: string;
    pendingAuth: string;
    oldestPending: string;
    status: string;
}

const POOL_MAX = 2;
const BUDGET = 100;

export default function Health({ onBack }: { onBack: () => void }) {
    const [rows, setRows] = useState<Row[] | null>(null);
    useInput((input, key) => {
        if (key.escape) onBack();
    });
    useEffect(() => {
        let live = true;
        async function load(): Promise<void> {
            const out: Row[] = [];
            for (const slug of listPortalSlugs()) {
                const url = portalDbUrl(slug);
                if (!url) {
                    out.push({
                        slug,
                        size: "—",
                        sessions: "—",
                        pendingAuth: "—",
                        oldestPending: "—",
                        status: "no connection string",
                    });
                    continue;
                }
                const row: Row = {
                    slug,
                    size: "—",
                    sessions: "—",
                    pendingAuth: "—",
                    oldestPending: "—",
                    status: "ok",
                };
                try {
                    await withClient(url, async (c) => {
                        try {
                            const s = await c.query<{ size: string }>(
                                "SELECT pg_size_pretty(pg_database_size(current_database())) AS size",
                            );
                            row.size = s.rows[0]?.size ?? "—";
                        } catch {
                            row.size = "—";
                        }
                        try {
                            const s = await c.query<{ count: string }>(
                                'SELECT COUNT(*) AS count FROM sessions WHERE "revokedAt" IS NULL AND "expiresAt" > now()',
                            );
                            row.sessions = s.rows[0]?.count ?? "—";
                        } catch {
                            row.sessions = "—";
                        }
                        try {
                            const s = await c.query<{ count: string }>(
                                'SELECT COUNT(*) AS count FROM auth_pending WHERE "expiresAt" > now()',
                            );
                            row.pendingAuth = s.rows[0]?.count ?? "—";
                        } catch {
                            row.pendingAuth = "—";
                        }
                    });
                } catch {
                    row.status = "offline";
                }
                try {
                    const pending = await pendingMigrations(url);
                    row.oldestPending =
                        pending === null ? "unknown" : pending.length === 0 ? "none" : pending[0];
                } catch {
                    row.oldestPending = "unknown";
                }
                out.push(row);
            }
            if (live) setRows(out);
        }
        void load();
        return () => {
            live = false;
        };
    }, []);
    if (rows === null) return <Text>Loading health checks...</Text>;
    const used = rows.length * POOL_MAX;
    const budgetColor = used >= 90 ? "red" : used >= 70 ? "yellow" : "green";
    return (
        <Box flexDirection="column">
            <Text bold>Portal Health</Text>
            {rows.map((r) => (
                <Box key={r.slug} flexDirection="column">
                    <Text bold>
                        {r.slug} [{r.status}]
                    </Text>
                    <Text>
                        {"  "}Pool max: {POOL_MAX} (configured, no live handles) | DB size: {r.size}{" "}
                        | Active sessions: {r.sessions} | Pending auth rows: {r.pendingAuth}
                    </Text>
                    <Text> Oldest unapplied migration: {r.oldestPending}</Text>
                </Box>
            ))}
            <Text color={budgetColor}>
                Connection budget: {used} of {BUDGET} connections reserved ({rows.length} sites x{" "}
                {POOL_MAX} pool max).
            </Text>
            <Text dimColor>Press Esc to return to the menu.</Text>
        </Box>
    );
}
