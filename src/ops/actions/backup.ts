import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createDecipheriv, createHash } from "node:crypto";
import { z } from "zod";
import {
    adminUrlFor,
    backupEncryptionKey,
    backupFilePath,
    createDatabase,
    dbExists,
    decryptDump,
    dropDatabase,
    latestBackup,
    listBackups,
    parseDbUrl,
    pgDump,
    pgRestore,
    sealDumpIfConfigured,
    tableRowCounts,
    withClient,
    type BackupEntry,
} from "@/tui/lib/tui-db";
import { isSingleDbMode, portalDbUrl } from "@/db/client";
import type { ActionDefinition } from "../types";

const slug = z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/)
    .describe("Portal slug");

const SQL_HEADER = /PostgreSQL database dump|CREATE TABLE|SET statement_timeout/i;

async function hashFile(abs: string): Promise<string> {
    const hash = createHash("sha256");
    await new Promise<void>((resolve, reject) => {
        const stream = fs.createReadStream(abs);
        stream.on("data", (chunk: Buffer) => hash.update(chunk));
        stream.on("end", () => resolve());
        stream.on("error", reject);
    });
    return hash.digest("hex");
}

async function sampleIsSql(abs: string, encrypted: boolean): Promise<boolean> {
    const fd = fs.openSync(abs, "r");
    const head = Buffer.alloc(64);
    let read = 0;
    try {
        read = fs.readSync(fd, head, 0, 64, 0);
    } finally {
        fs.closeSync(fd);
    }
    if (!encrypted) return SQL_HEADER.test(head.subarray(0, read).toString("utf8"));
    const key = backupEncryptionKey();
    if (!key || read < 34 || head.subarray(0, 6).toString("ascii") !== "GPENC1") return false;
    const sample = Buffer.alloc(4096);
    const sfd = fs.openSync(abs, "r");
    let n = 0;
    try {
        n = fs.readSync(sfd, sample, 0, sample.length, 34);
    } finally {
        fs.closeSync(sfd);
    }
    if (n === 0) return false;
    const decipher = createDecipheriv("aes-256-gcm", key, head.subarray(6, 18));
    return SQL_HEADER.test(decipher.update(sample.subarray(0, n)).toString("utf8", 0, 256));
}

async function verifyBackup(
    entry: BackupEntry,
): Promise<{ valid: boolean; sha256: string; encrypted: boolean }> {
    const encrypted = entry.file.endsWith(".enc");
    if (entry.bytes <= 100) return { valid: false, sha256: "", encrypted };
    const sha256 = await hashFile(entry.abs);
    if (!encrypted) return { valid: await sampleIsSql(entry.abs, false), sha256, encrypted };
    const key = backupEncryptionKey();
    if (!key) return { valid: false, sha256, encrypted };
    try {
        const decoded = await decryptDump(entry.abs, key);
        try {
            const fd = fs.openSync(decoded.path, "r");
            const head = Buffer.alloc(256);
            let read = 0;
            try {
                read = fs.readSync(fd, head, 0, head.length, 0);
            } finally {
                fs.closeSync(fd);
            }
            return {
                valid: SQL_HEADER.test(head.subarray(0, read).toString("utf8")),
                sha256,
                encrypted,
            };
        } finally {
            await fsp.rm(path.dirname(decoded.path), { recursive: true, force: true });
        }
    } catch {
        return { valid: false, sha256, encrypted };
    }
}

async function restoreSource(
    entry: BackupEntry,
): Promise<{ path: string; cleanup: () => Promise<void> }> {
    if (!entry.file.endsWith(".enc")) return { path: entry.abs, cleanup: async () => undefined };
    const key = backupEncryptionKey();
    if (!key) throw new Error("BACKUP_ENCRYPTION_KEY is required to restore an encrypted backup");
    const decoded = await decryptDump(entry.abs, key);
    return {
        path: decoded.path,
        cleanup: async () => {
            await fsp.rm(path.dirname(decoded.path), { recursive: true, force: true });
        },
    };
}

export const backupActions: ActionDefinition[] = [
    {
        id: "backup.create",
        group: "backup",
        summary: "Create a verified backup for a portal, encrypted when a key is configured",
        scopes: ["ops:backup"],
        destructive: false,
        params: z.object({
            slug,
            tag: z
                .string()
                .regex(/^[a-zA-Z0-9_-]{0,32}$/)
                .optional(),
        }),
        run: async ({ slug, tag }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            const staged = backupFilePath(slug, tag || "manual");
            const out = await pgDump(url, staged);
            if (!out.ok) throw new Error(`Backup failed: ${out.out}`);
            const sealed = await sealDumpIfConfigured(staged);
            return {
                slug,
                bytes: sealed?.bytes ?? out.bytes,
                file: sealed?.path ?? latestBackup(slug)?.file ?? null,
                encrypted: Boolean(sealed),
            };
        },
    },
    {
        id: "backup.list",
        group: "backup",
        summary: "List existing backups with sizes and timestamps",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug }),
        run: async ({ slug }) =>
            listBackups(slug).map(({ file, bytes, display }) => ({ file, bytes, display })),
    },
    {
        id: "backup.verify",
        group: "backup",
        summary: "Verify a plain or encrypted backup has a valid header, size and content sample",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug, file: z.string().optional() }),
        run: async ({ slug, file }) => {
            const entries = listBackups(slug);
            const chosen = file ? entries.find((e) => e.file === file) : entries[0];
            if (!chosen) throw new Error("Backup not found");
            const { valid, sha256, encrypted } = await verifyBackup(chosen);
            return { slug, file: chosen.file, bytes: chosen.bytes, encrypted, sha256, valid };
        },
    },
    {
        id: "backup.restore",
        group: "backup",
        summary: "Restore a backup after taking a pre-restore backup and typed confirmation",
        scopes: ["ops:danger"],
        destructive: true,
        confirmField: "slug",
        params: z.object({ slug, file: z.string().optional() }),
        preview: async ({ slug, file }) => {
            const entries = listBackups(slug);
            const chosen = file ? entries.find((e) => e.file === file) : entries[0];
            if (isSingleDbMode()) {
                return {
                    slug,
                    file: chosen?.file ?? null,
                    bytes: chosen?.bytes ?? 0,
                    warning:
                        "Single-DB mode: restore is refused; use the trash/admin flows instead.",
                };
            }
            return { slug, file: chosen?.file ?? null, bytes: chosen?.bytes ?? 0 };
        },
        run: async ({ slug, file }) => {
            if (isSingleDbMode()) {
                throw new Error(
                    "Refusing to restore a backup in single-DB mode; use the per-workspace trash/admin flows instead.",
                );
            }
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            const entries = listBackups(slug);
            const chosen = file ? entries.find((e) => e.file === file) : entries[0];
            if (!chosen || chosen.bytes < 100) throw new Error("No valid backup to restore");
            const staged = backupFilePath(slug, "pre-restore");
            const pre = await pgDump(url, staged);
            if (!pre.ok) throw new Error("Refusing to restore: pre-restore backup failed");
            const sealed = await sealDumpIfConfigured(staged);
            const source = await restoreSource(chosen);
            try {
                const result = await pgRestore(url, source.path);
                if (result.code !== 0) throw new Error(`Restore failed: ${result.out}`);
                return { slug, restored: chosen.file, preRestoreBytes: sealed?.bytes ?? pre.bytes };
            } finally {
                await source.cleanup();
            }
        },
    },
    {
        id: "dr.drill",
        group: "backup",
        summary: "Restore the newest backup into a scratch DB, verify rows, then drop it",
        scopes: ["ops:backup"],
        destructive: false,
        params: z.object({ slug }),
        run: async ({ slug }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            const backup = latestBackup(slug);
            if (!backup || backup.bytes < 100) throw new Error("No verified backup exists");
            const parsed = parseDbUrl(url);
            const scratchName = `${parsed.dbName}_drill`;
            const admin = adminUrlFor(url);
            if ((await dbExists(admin, scratchName)) !== false) {
                throw new Error("Scratch database already exists; remove it first");
            }
            await createDatabase(admin, scratchName);
            const scratchUrl = new URL(url);
            scratchUrl.pathname = `/${scratchName}`;
            const source = await restoreSource(backup);
            try {
                const r = await pgRestore(scratchUrl.toString(), source.path);
                if (r.code !== 0) throw new Error(`Drill restore failed: ${r.out}`);
                const counts = await tableRowCounts(scratchUrl.toString(), [
                    "users",
                    "workspaces",
                    "tasks",
                    "events",
                    "proposals",
                ]);
                const live = await tableRowCounts(url, [
                    "users",
                    "workspaces",
                    "tasks",
                    "events",
                    "proposals",
                ]);
                const rows = counts.map((c, i) => ({
                    table: c.table,
                    restored: c.count,
                    live: live[i]?.count ?? "—",
                }));
                return {
                    slug,
                    backup: backup.file,
                    rows,
                    healthy: rows.every((r) => r.restored !== "—"),
                };
            } finally {
                await source.cleanup();
                try {
                    await dropDatabase(admin, scratchName);
                } catch {
                    return { slug, warning: "Scratch database could not be removed automatically" };
                }
            }
        },
    },
    {
        id: "danger.drop-database",
        group: "danger",
        summary: "Alias of site.remove",
        scopes: ["ops:danger"],
        destructive: true,
        confirmField: "slug",
        params: z.object({ slug }),
        preview: async ({ slug }) => {
            const url = portalDbUrl(slug);
            if (!url) return { slug, error: "unknown portal" };
            const backup = latestBackup(slug);
            if (isSingleDbMode()) {
                return {
                    slug,
                    database: parseDbUrl(url).dbName,
                    verifiedBackup: backup ? { file: backup.file, bytes: backup.bytes } : null,
                    warning:
                        "Single-DB mode: physical drop is refused; use trash/admin data deletion instead.",
                };
            }
            const rows = await tableRowCounts(url, ["users", "workspaces", "memberships"]);
            return {
                slug,
                database: parseDbUrl(url).dbName,
                rows,
                verifiedBackup: backup ? { file: backup.file, bytes: backup.bytes } : null,
            };
        },
        run: async ({ slug }) => {
            if (isSingleDbMode()) {
                throw new Error(
                    "Refusing to drop a database in single-DB mode; delete portal data via the trash/admin flows instead.",
                );
            }
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            const backup = latestBackup(slug);
            if (!backup || backup.bytes < 100) throw new Error("No verified backup");
            const parsed = parseDbUrl(url);
            await dropDatabase(adminUrlFor(url), parsed.dbName);
            return { slug, dropped: true };
        },
    },
];

export async function workspaceIdFor(slug: string): Promise<string | null> {
    const url = portalDbUrl(slug);
    if (!url) return null;
    try {
        const rows = await withClient(url, async (c) => {
            const r = await c.query<{ id: string }>(
                "SELECT id FROM workspaces WHERE slug = $1 LIMIT 1",
                [slug],
            );
            return r.rows;
        });
        return rows[0]?.id ?? null;
    } catch {
        return null;
    }
}
