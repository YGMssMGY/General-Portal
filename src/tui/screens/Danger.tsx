import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectList from "../components/SelectList.js";
import { withClient } from "../lib/tui-db.js";
import { audit } from "../lib/audit-log.js";
import { isSingleDbMode, listPortalSlugs, portalDbUrl } from "../../db/client.js";

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
            if (isSingleDbMode()) {
                setLines([
                    "Single-DB mode: physical database drops are refused; delete portal data via the trash/admin flows instead.",
                ]);
                setStep("done");
                return;
            }
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
                const ws = await c.query<{ id: string }>(
                    "SELECT id FROM workspaces WHERE slug = $1 LIMIT 1",
                    [slug],
                );
                const wid = ws.rows[0]?.id;
                if (!wid) return `No workspace for "${slug}". Nothing was changed.`;
                if (needsEmail) {
                    const found = await c.query<{ id: string }>(
                        'SELECT u.id FROM users u JOIN memberships m ON m."userId" = u.id WHERE u.email = $1 AND m."workspaceId" = $2 LIMIT 1',
                        [email.toLowerCase(), wid],
                    );
                    if (!found.rows[0])
                        return `User "${email}" is not a member of "${slug}". Nothing was changed.`;
                    await c.query("UPDATE users SET disabled = true WHERE id = $1", [
                        found.rows[0].id,
                    ]);
                    return `User "${email}" is now disabled.`;
                }
                const r = await c.query(
                    'UPDATE sessions SET "revokedAt" = now() WHERE "workspaceId" = $1 AND "revokedAt" IS NULL',
                    [wid],
                );
                return `Revoked ${r.rowCount ?? 0} active sessions for portal "${slug}".`;
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
