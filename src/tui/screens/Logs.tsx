import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { withClient } from "../lib/tui-db.js";
import { listPortalSlugs, portalDbUrl } from "../../db/client.js";

interface Entry {
    portal: string;
    action: string;
    entity: string;
    time: string;
}

export default function Logs({ onBack }: { onBack: () => void }) {
    const [rows, setRows] = useState<Entry[] | null>(null);
    useInput((input, key) => {
        if (key.escape) onBack();
    });
    useEffect(() => {
        let live = true;
        async function load(): Promise<void> {
            const all: Entry[] = [];
            for (const slug of listPortalSlugs()) {
                const url = portalDbUrl(slug);
                if (!url) continue;
                try {
                    const found = await withClient(url, async (c) => {
                        const r = await c.query<{ action: string; entity: string; time: string }>(
                            'SELECT action, "entityType" AS entity, "createdAt" AS time FROM audit_logs ORDER BY "createdAt" DESC LIMIT 50',
                        );
                        return r.rows;
                    });
                    for (const row of found) {
                        all.push({
                            portal: slug,
                            action: row.action,
                            entity: row.entity,
                            time: new Date(row.time).toLocaleString("en-US"),
                        });
                    }
                } catch {
                    continue;
                }
            }
            all.sort((a, b) => (a.time < b.time ? 1 : -1));
            if (live) setRows(all.slice(0, 50));
        }
        void load();
        return () => {
            live = false;
        };
    }, []);
    if (rows === null) return <Text>Loading audit entries...</Text>;
    return (
        <Box flexDirection="column">
            <Text bold>Recent Audit Entries (limit 50, all portals)</Text>
            {rows.length === 0 && <Text dimColor>No audit entries found.</Text>}
            {rows.map((r, i) => (
                <Text key={`${r.portal}-${r.time}-${i}`}>
                    {r.time} [{r.portal}] {r.action} {r.entity}
                </Text>
            ))}
            <Text dimColor>Press Esc to return to the menu.</Text>
        </Box>
    );
}
