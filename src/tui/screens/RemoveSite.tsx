import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectList from "../components/SelectList.js";
import {
    adminUrlFor,
    backupFilePath,
    dbExists,
    dropDatabase,
    formatBytes,
    parseDbUrl,
    pgDump,
    tableRowCounts,
    withClient,
} from "../lib/tui-db.js";
import { audit } from "../lib/audit-log.js";
import { listPortalSlugs, portalDbUrl } from "../../db/client.js";

type Step = "pick" | "impact" | "confirm" | "working" | "done";

const IMPACT_TABLES = [
    "users",
    "workspaces",
    "roles",
    "memberships",
    "tasks",
    "events",
    "proposals",
    "transactions",
    "audit_logs",
    "attachments",
    "sessions",
];

export default function RemoveSite({ onBack }: { onBack: () => void }) {
    const [step, setStep] = useState<Step>("pick");
    const [slug, setSlug] = useState("");
    const [lines, setLines] = useState<string[]>([]);
    const [typed, setTyped] = useState("");
    useInput((input, key) => {
        if (key.escape && step !== "working") {
            if (step === "pick") onBack();
            else if (step === "impact") setStep("pick");
            else if (step === "confirm") setStep("impact");
            else if (step === "done") onBack();
        }
    });
    const slugs = listPortalSlugs();

    async function preview(target: string): Promise<void> {
        setSlug(target);
        setStep("working");
        setLines(["Measuring impact..."]);
        const url = portalDbUrl(target);
        if (!url) {
            setLines([`[${target}] no connection string set. Nothing to remove.`]);
            setStep("done");
            return;
        }
        const out: string[] = [`Impact preview for portal "${target}":`];
        try {
            const parsed = parseDbUrl(url);
            out.push(`Database name: ${parsed.dbName} on ${parsed.host}:${parsed.port}`);
        } catch {
            out.push("Database: could not parse connection string.");
        }
        const counts = await tableRowCounts(url, IMPACT_TABLES);
        let members = "—";
        for (const row of counts) {
            out.push(`  ${row.table}: ${row.count} rows`);
            if (row.table === "memberships") members = row.count;
        }
        try {
            const size = await withClient(url, async (c) => {
                const r = await c.query<{ size: string }>(
                    "SELECT pg_size_pretty(pg_database_size(current_database())) AS size",
                );
                return r.rows[0]?.size ?? "—";
            });
            out.push(`Database size: ${size}. Members: ${members}.`);
        } catch {
            out.push("Database size: unavailable (database offline).");
        }
        out.push("A verified backup is mandatory before removal. It runs next.");
        setLines(out);
        setStep("impact");
    }

    async function execute(target: string, typedSlug: string): Promise<void> {
        if (typedSlug !== target) {
            setLines([
                `Confirmation did not match "${target}". Removal aborted. Nothing was changed.`,
            ]);
            audit("remove-site", target, "aborted: confirmation mismatch");
            setStep("done");
            return;
        }
        setStep("working");
        const url = portalDbUrl(target);
        if (!url) {
            setLines([`[${target}] no connection string set. Nothing to remove.`]);
            setStep("done");
            return;
        }
        setLines(["Creating verified backup before removal..."]);
        const outPath = backupFilePath(target, "pre-remove");
        const backup = await pgDump(url, outPath);
        if (!backup.ok) {
            setLines([
                `[${target}] REFUSED: backup failed. Database was NOT dropped. Output: ${backup.out.slice(0, 500)}`,
            ]);
            audit("remove-site", target, "refused: backup failed");
            setStep("done");
            return;
        }
        const out: string[] = [
            `[${target}] verified backup: ${outPath} (${formatBytes(backup.bytes)}).`,
            "Dropping database...",
        ];
        setLines(out);
        try {
            const parsed = parseDbUrl(url);
            const adminUrl = adminUrlFor(url);
            const exists = await dbExists(adminUrl, parsed.dbName);
            if (exists === false) {
                out.push(`Database "${parsed.dbName}" does not exist. Nothing to drop.`);
                audit("remove-site", target, "no-op: database missing");
            } else {
                await dropDatabase(adminUrl, parsed.dbName);
                out.push(`Database "${parsed.dbName}" dropped. Backup retained at ${outPath}.`);
                audit("remove-site", target, `ok: dropped, backup at ${outPath}`);
            }
            out.push(
                "Next step: remove the portal block from deployment.yaml manually. This tool never edits deployment.yaml.",
            );
        } catch (e) {
            out.push(
                `Removal FAILED: ${e instanceof Error ? e.message : String(e)}. Backup retained at ${outPath}.`,
            );
            audit("remove-site", target, "failed during drop");
        }
        setLines([...out]);
        setStep("done");
    }

    return (
        <Box flexDirection="column">
            <Text bold color="red">
                Remove Site (destructive)
            </Text>
            {step === "pick" && (
                <Box flexDirection="column">
                    <Text>Select a portal to remove. This tool is interactive only.</Text>
                    {slugs.length === 0 && <Text dimColor>No portals found in environment.</Text>}
                    <SelectList items={slugs} onSelect={(item) => void preview(item)} />
                </Box>
            )}
            {step === "working" && (
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                </Box>
            )}
            {step === "impact" && (
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                    <Text color="red">Type the portal slug to confirm removal of {slug}:</Text>
                    <TextInput
                        value={typed}
                        onChange={setTyped}
                        onSubmit={(v) => void execute(slug, v)}
                    />
                    <Text dimColor>Press Esc to abort.</Text>
                </Box>
            )}
            {step === "confirm" && <Text>Confirm removal.</Text>}
            {step === "done" && (
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                    <Text dimColor>
                        Press Esc to return to the menu. Backups are never deleted.
                    </Text>
                </Box>
            )}
            {step === "pick" && <Text dimColor>Press Esc to return to the menu.</Text>}
        </Box>
    );
}
