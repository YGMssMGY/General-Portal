import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectList from "../components/SelectList.js";
import { withClient } from "../lib/tui-db.js";
import { audit } from "../lib/audit-log.js";
import { listPortalSlugs, portalDbUrl } from "../../db/client.js";

type Step = "action" | "portal" | "user" | "confirm" | "working" | "done";

export default function Danger({
    onBack,
    onDropDatabase,
}: {
    onBack: () => void;
    onDropDatabase: () => void;
}) {
    const [step, setStep] = useState<Step>("action");
    const [action, setAction] = useState("");
    const [slug, setSlug] = useState("");
    const [email, setEmail] = useState("");
    const [typed, setTyped] = useState("");
    const [lines, setLines] = useState<string[]>([]);
    useInput((input, key) => {
        if (key.escape && step !== "working") {
            if (step === "action") onBack();
            else setStep("action");
        }
    });
    const slugs = listPortalSlugs();
    const needsEmail = action.startsWith("Disable");
    const targetLabel = needsEmail ? email : slug;
    const prompt = needsEmail
        ? `Type the user email to confirm disabling "${email}":`
        : `Type the portal slug to confirm for "${slug}":`;

    function begin(selected: string): void {
        setAction(selected);
        setTyped("");
        setEmail("");
        if (selected.startsWith("Drop")) {
            onDropDatabase();
            return;
        }
        setStep("portal");
    }

    async function execute(typedValue: string): Promise<void> {
        const expected = needsEmail ? email : slug;
        if (typedValue !== expected || !expected) {
            setLines([
                `Confirmation did not match "${expected}". Action aborted. Nothing was changed.`,
            ]);
            audit("danger", `${action} ${targetLabel}`, "aborted: confirmation mismatch");
            setStep("done");
            return;
        }
        setStep("working");
        const url = portalDbUrl(slug);
        if (!url) {
            setLines([`[${slug}] no connection string set. Nothing was changed.`]);
            setStep("done");
            return;
        }
        try {
            const result = await withClient(url, async (c) => {
                if (needsEmail) {
                    const found = await c.query<{ id: string; disabled: boolean }>(
                        "SELECT id, disabled FROM users WHERE email = $1 LIMIT 1",
                        [email],
                    );
                    if (!found.rows[0]) return `User "${email}" not found. Nothing was changed.`;
                    await c.query("UPDATE users SET disabled = true WHERE id = $1", [
                        found.rows[0].id,
                    ]);
                    return `User "${email}" is now disabled.`;
                }
                const r = await c.query<{ count: string }>(
                    'UPDATE sessions SET "revokedAt" = now() WHERE "revokedAt" IS NULL RETURNING 1',
                );
                return `Revoked ${r.rows.length} active sessions for portal "${slug}".`;
            });
            setLines([result]);
            audit("danger", `${action} ${targetLabel}`, result);
        } catch (e) {
            const msg = `Action FAILED: ${e instanceof Error ? e.message : String(e)}.`;
            setLines([msg]);
            audit("danger", `${action} ${targetLabel}`, "failed");
        }
        setStep("done");
    }

    return (
        <Box flexDirection="column">
            <Text bold color="red">
                Danger Zone (typed confirmation required)
            </Text>
            {step === "action" && (
                <Box flexDirection="column">
                    <Text>Select a sensitive action:</Text>
                    <SelectList
                        items={[
                            "Revoke all sessions for a portal",
                            "Disable a user",
                            "Drop a database (RemoveSite flow)",
                        ]}
                        onSelect={(item) => begin(item)}
                    />
                </Box>
            )}
            {step === "portal" && (
                <Box flexDirection="column">
                    <Text>{action}. Select a portal:</Text>
                    <SelectList
                        items={slugs}
                        onSelect={(item) => {
                            setSlug(item);
                            setStep(needsEmail ? "user" : "confirm");
                        }}
                    />
                </Box>
            )}
            {step === "user" && (
                <Box flexDirection="column">
                    <Text>Enter the user email to disable in portal {slug}:</Text>
                    <TextInput
                        value={email}
                        onChange={setEmail}
                        onSubmit={() => setStep("confirm")}
                    />
                </Box>
            )}
            {step === "confirm" && (
                <Box flexDirection="column">
                    <Text color="red">{prompt}</Text>
                    <TextInput
                        value={typed}
                        onChange={setTyped}
                        onSubmit={(v) => void execute(v)}
                    />
                </Box>
            )}
            {step === "working" && <Text>Working, please wait...</Text>}
            {step === "done" && (
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                    <Text dimColor>Press Esc to go back.</Text>
                </Box>
            )}
            <Text dimColor>Press Esc to go back. Every action is audit-logged.</Text>
        </Box>
    );
}
