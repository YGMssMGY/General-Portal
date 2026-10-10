import { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getSiteInfo, type SiteInfo } from "../lib/tui-db.js";
import { listPortals } from "../../lib/deployment/index.js";
import { listPortalSlugs, portalDbUrl } from "../../db/client.js";

function pad(s: string, n: number): string {
    return s.length >= n ? s.slice(0, n) : s + " ".repeat(n - s.length);
}

export default function Sites({ onBack }: { onBack: () => void }) {
    const [rows, setRows] = useState<SiteInfo[] | null>(null);
    const [version, setVersion] = useState(0);
    useInput((input, key) => {
        if (key.escape) onBack();
        else if (input === "r") setVersion((v) => v + 1);
    });
    useEffect(() => {
        let live = true;
        async function load(): Promise<void> {
            let slugs: string[] = [];
            try {
                slugs = listPortals().map((p) => p.slug);
            } catch {
                slugs = [];
            }
            for (const s of listPortalSlugs()) {
                if (!slugs.includes(s)) slugs.push(s);
            }
            const infos: SiteInfo[] = [];
            for (const slug of slugs) {
                const url = portalDbUrl(slug);
                if (!url) {
                    infos.push({
                        slug,
                        workspace: "no connection string",
                        members: "—",
                        size: "—",
                        migrations: "—",
                        backup: "—",
                    });
                    continue;
                }
                infos.push(await getSiteInfo(slug, url));
            }
            if (live) setRows(infos);
        }
        void load();
        return () => {
            live = false;
        };
    }, [version]);
    if (rows === null) return <Text>Loading site inventory...</Text>;
    return (
        <Box flexDirection="column">
            <Text bold>Site Inventory</Text>
            <Text dimColor>
                {pad("Slug", 14)}
                {pad("Workspace", 24)}
                {pad("Members", 8)}
                {pad("DB Size", 10)}
                {pad("Migr", 9)}
                {"Last Backup"}
            </Text>
            {rows.length === 0 && <Text dimColor>No portals configured.</Text>}
            {rows.map((r) => (
                <Text key={r.slug}>
                    {pad(r.slug, 14)}
                    {pad(r.workspace, 24)}
                    {pad(r.members, 8)}
                    {pad(r.size, 10)}
                    {pad(r.migrations, 9)}
                    {r.backup}
                </Text>
            ))}
            <Text dimColor>Press R to refresh. Press Esc to return to the menu.</Text>
        </Box>
    );
}
