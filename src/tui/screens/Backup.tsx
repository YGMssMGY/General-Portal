import { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectList from "../components/SelectList.js";
import {
    backupFilePath,
    formatBytes,
    listBackups,
    pgDump,
    pgRestore,
    type BackupEntry,
} from "../lib/tui-db.js";
import { audit } from "../lib/audit-log.js";
import { listPortalSlugs, portalDbUrl } from "../../db/client.js";

type Step = "pick" | "actions" | "working" | "list" | "restore-pick" | "restore-confirm" | "done";

export default function Backup({ onBack }: { onBack: () => void }) {
    const [step, setStep] = useState<Step>("pick");
    const [slug, setSlug] = useState("");
    const [lines, setLines] = useState<string[]>([]);
    const [files, setFiles] = useState<BackupEntry[]>([]);
    const [confirm, setConfirm] = useState("");
    const [restoreFile, setRestoreFile] = useState<BackupEntry | null>(null);
    useInput((input, key) => {
        if (key.escape && step !== "working") {
            if (step === "pick") onBack();
            else if (step === "actions") setStep("pick");
            else if (step === "list" || step === "done") setStep("actions");
            else if (step === "restore-pick") setStep("actions");
            else if (step === "restore-confirm") setStep("restore-pick");
        }
    });
    const slugs = listPortalSlugs();

    function showList(target: string): void {
        const found = listBackups(target);
        setFiles(found);
        const out = found.length === 0 ? ["No backups recorded."] : found.map((f) => f.display);
        const total = found.reduce((n, f) => n + f.bytes, 0);
        out.push(
            `Total retained: ${found.length} files, ${formatBytes(total)}. Backups are never deleted by this tool.`,
        );
        setLines(out);
        setStep("list");
    }

    async function createBackup(target: string): Promise<void> {
        setStep("working");
        setLines(["Creating backup..."]);
        const url = portalDbUrl(target);
        if (!url) {
            setLines([`[${target}] failed: connection string not set.`]);
            audit("backup", target, "failed: no connection string");
            setStep("done");
            return;
        }
        const outPath = backupFilePath(target, "manual");
        const r = await pgDump(url, outPath);
        if (r.ok) {
            setLines([`[${target}] backup complete: ${outPath} (${formatBytes(r.bytes)}).`]);
            audit("backup", target, `ok: ${outPath} (${r.bytes} bytes)`);
        } else {
            setLines([
                `[${target}] backup FAILED. No file retained. Output: ${r.out.slice(0, 500)}`,
            ]);
            audit("backup", target, "failed");
        }
        setStep("done");
    }

    async function restore(target: string, entry: BackupEntry, typed: string): Promise<void> {
        if (typed !== target) {
            setLines([
                `Confirmation did not match "${target}". Restore aborted. Nothing was changed.`,
            ]);
            audit("restore", target, "aborted: confirmation mismatch");
            setStep("done");
            return;
        }
        setStep("working");
        setLines(["Verifying a pre-restore backup of the current database..."]);
        const url = portalDbUrl(target);
        if (!url) {
            setLines([`[${target}] failed: connection string not set.`]);
            setStep("done");
            return;
        }
        const pre = await pgDump(url, backupFilePath(target, "pre-restore"));
        if (!pre.ok) {
            setLines([
                `[${target}] REFUSED: pre-restore backup failed. Restore aborted to protect current data. Output: ${pre.out.slice(0, 500)}`,
            ]);
            audit("restore", target, "refused: pre-restore backup failed");
            setStep("done");
            return;
        }
        const r = await pgRestore(url, entry.abs);
        if (r.code === 0) {
            setLines([
                `[${target}] restore complete from ${entry.file}.`,
                `Pre-restore backup retained for rollback.`,
            ]);
            audit("restore", target, `ok: from ${entry.file}`);
        } else {
            setLines([
                `[${target}] restore FAILED with exit ${r.code}. Pre-restore backup is available for rollback. Output: ${r.out.slice(0, 500)}`,
            ]);
            audit("restore", target, `failed: exit ${r.code}`);
        }
        setStep("done");
    }

    return (
        <Box flexDirection="column">
            <Text bold>Backup and Restore</Text>
            {step === "pick" && (
                <Box flexDirection="column">
                    <Text>Select a portal:</Text>
                    {slugs.length === 0 && <Text dimColor>No portals found in environment.</Text>}
                    <SelectList
                        items={slugs}
                        onSelect={(item) => {
                            setSlug(item);
                            setStep("actions");
                        }}
                    />
                </Box>
            )}
            {step === "actions" && (
                <Box flexDirection="column">
                    <Text>Portal: {slug}. Select an action:</Text>
                    <SelectList
                        items={[
                            "Create backup now",
                            "List backups and retention",
                            "Restore from backup",
                        ]}
                        onSelect={(item) => {
                            if (item.startsWith("Create")) void createBackup(slug);
                            else if (item.startsWith("List")) showList(slug);
                            else {
                                setFiles(listBackups(slug));
                                setStep("restore-pick");
                            }
                        }}
                    />
                </Box>
            )}
            {step === "working" && (
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                </Box>
            )}
            {step === "list" && (
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                    <Text dimColor>Press Esc to go back.</Text>
                </Box>
            )}
            {step === "restore-pick" && (
                <Box flexDirection="column">
                    <Text>Select a backup file to restore (current data is backed up first):</Text>
                    {files.length === 0 && <Text dimColor>No backups available for {slug}.</Text>}
                    <SelectList
                        items={files.map((f) => f.display)}
                        onSelect={(_item, index) => {
                            const entry = files[index];
                            if (!entry) return;
                            setRestoreFile(entry);
                            setConfirm("");
                            setStep("restore-confirm");
                        }}
                    />
                </Box>
            )}
            {step === "restore-confirm" && restoreFile && (
                <Box flexDirection="column">
                    <Text color="red">
                        Restore {slug} from {restoreFile.file}? This overwrites current data.
                    </Text>
                    <Text>Type the portal slug to confirm:</Text>
                    <TextInput
                        value={confirm}
                        onChange={setConfirm}
                        onSubmit={(v) => void restore(slug, restoreFile, v)}
                    />
                </Box>
            )}
            {step === "done" && (
                <Box flexDirection="column">
                    {lines.map((line, i) => (
                        <Text key={i}>{line}</Text>
                    ))}
                    <Text dimColor>Press Esc to go back.</Text>
                </Box>
            )}
            <Text dimColor>Press Esc to go back. Backups are never deleted by any flow.</Text>
        </Box>
    );
}
