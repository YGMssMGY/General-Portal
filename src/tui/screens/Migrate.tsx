import { useState } from "react";
import { Box, Text, useInput } from "ink";
import SelectList from "../components/SelectList.js";
import { migrationFiles, pendingMigrations, runTsx } from "../lib/tui-db.js";
import { audit } from "../lib/audit-log.js";
import { listPortalSlugs, portalDbUrl } from "../../db/client.js";

type Step = "scope" | "mode" | "working" | "done";

export default function Migrate({ onBack }: { onBack: () => void }) {
    const [step, setStep] = useState<Step>("scope");
    const [scope, setScope] = useState("all portals");
    const [dryRun, setDryRun] = useState(true);
    const [lines, setLines] = useState<string[]>([]);
    useInput((input, key) => {
        if (key.escape && step !== "working") onBack();
    });
    const slugs = listPortalSlugs();
    async function execute(target: string, dry: boolean): Promise<void> {
        setStep("working");
        const out: string[] = [];
        const targets = target === "all portals" ? slugs : [target];
        if (targets.length === 0) {
            out.push("No portals configured. Nothing to do.");
            setLines(out);
            setStep("done");
            return;
        }
        for (const slug of targets) {
            const url = portalDbUrl(slug);
            if (!url) {
                out.push(`[${slug}] skipped: connection string not set.`);
                continue;
            }
            const pending = await pendingMigrations(url);
            if (pending === null) {
                out.push(`[${slug}] skipped: database offline or unreachable.`);
                continue;
            }
            if (pending.length === 0) {
                out.push(`[${slug}] up to date (${migrationFiles().length} applied).`);
                continue;
            }
            out.push(`[${slug}] pending: ${pending.join(", ")}`);
            if (dry) continue;
            const r = await runTsx("scripts/migrate.ts", [url]);
            out.push(`[${slug}] migrate exit ${r.code}`);
            for (const line of r.out.split("\n").slice(-8)) {
                if (line.trim()) out.push(`[${slug}] ${line.trim()}`);
            }
            audit("migrate", slug, r.code === 0 ? "applied" : `exit ${r.code}`);
        }
        setLines(out);
        setStep("done");
    }
    return (
        <Box flexDirection="column">
            <Text bold>Migrate Databases</Text>
            {step === "scope" && (
                <Box flexDirection="column">
                    <Text>Select migration scope:</Text>
                    <SelectList
                        items={["all portals", ...slugs]}
                        onSelect={(item) => {
                            setScope(item);
                            setStep("mode");
                        }}
                    />
                </Box>
            )}
            {step === "mode" && (
                <Box flexDirection="column">
                    <Text>Scope: {scope}. Select mode:</Text>
                    <SelectList
                        items={["Dry run (list pending only)", "Apply migrations"]}
                        onSelect={(item) => {
                            const dry = item.startsWith("Dry run");
                            setDryRun(dry);
                            void execute(scope, dry);
                        }}
                    />
                </Box>
            )}
            {step === "working" && <Text>Working, please wait...</Text>}
            {step === "done" && (
                <Box flexDirection="column">
                    <Text>
                        {dryRun ? "Dry run complete." : "Migration run complete."} Scope: {scope}.
                    </Text>
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                    <Text dimColor>Press Esc to return to the menu.</Text>
                </Box>
            )}
            {step !== "done" && step !== "working" && (
                <Text dimColor>Press Esc to return to the menu.</Text>
            )}
            {step === "scope" && slugs.length === 0 && (
                <Text dimColor>No portals found in environment.</Text>
            )}
        </Box>
    );
}
