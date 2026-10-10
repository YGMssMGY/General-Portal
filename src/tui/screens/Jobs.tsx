import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { withClient } from "../lib/tui-db.js";
import { listPortalSlugs, portalDbUrl } from "../../db/client.js";

interface PortalJobs {
    slug: string;
    wired: boolean;
    states: Array<{ state: string; count: string }>;
    failed: string[];
    note: string;
}

export default function Jobs({ onBack }: { onBack: () => void }) {
    const [rows, setRows] = useState<PortalJobs[] | null>(null);
    useInput((input, key) => {
        if (key.escape) onBack();
    });
    useEffect(() => {
        let live = true;
        async function load(): Promise<void> {
            const out: PortalJobs[] = [];
            for (const slug of listPortalSlugs()) {
                const url = portalDbUrl(slug);
                if (!url) {
                    out.push({
                        slug,
                        wired: false,
                        states: [],
                        failed: [],
                        note: "no connection string",
                    });
                    continue;
                }
                try {
                    const data = await withClient(url, async (c) => {
                        const reg = await c.query<{ name: string | null }>(
                            "SELECT to_regclass('pgboss.job') AS name",
                        );
                        if (!reg.rows[0]?.name) return null;
                        const counts = await c.query<{ state: string; count: string }>(
                            "SELECT state, COUNT(*) AS count FROM pgboss.job GROUP BY state ORDER BY state",
                        );
                        let failed: string[] = [];
                        try {
                            const f = await c.query<{ name: string }>(
                                "SELECT name FROM pgboss.job WHERE state = 'failed' LIMIT 10",
                            );
                            failed = f.rows.map((r) => r.name);
                        } catch {
                            failed = [];
                        }
                        return { counts: counts.rows, failed };
                    });
                    if (data === null) {
                        out.push({
                            slug,
                            wired: false,
                            states: [],
                            failed: [],
                            note: "jobs not wired yet",
                        });
                    } else {
                        out.push({
                            slug,
                            wired: true,
                            states: data.counts,
                            failed: data.failed,
                            note: "",
                        });
                    }
                } catch {
                    out.push({
                        slug,
                        wired: false,
                        states: [],
                        failed: [],
                        note: "database offline",
                    });
                }
            }
            if (live) setRows(out);
        }
        void load();
        return () => {
            live = false;
        };
    }, []);
    if (rows === null) return <Text>Loading job queues...</Text>;
    return (
        <Box flexDirection="column">
            <Text bold>Background Jobs (pg-boss)</Text>
            {rows.map((r) => (
                <Box key={r.slug} flexDirection="column">
                    <Text bold>{r.slug}</Text>
                    {!r.wired && <Text dimColor> {r.note}</Text>}
                    {r.wired && r.states.length === 0 && (
                        <Text dimColor> Queue tables present, no jobs recorded.</Text>
                    )}
                    {r.states.map((s) => (
                        <Text key={s.state}>
                            {"  "}
                            {s.state}: {s.count}
                        </Text>
                    ))}
                    {r.failed.length > 0 && (
                        <Text color="red"> Failed jobs: {r.failed.join(", ")}</Text>
                    )}
                </Box>
            ))}
            <Text dimColor>Press Esc to return to the menu.</Text>
        </Box>
    );
}
