import fs from "node:fs";
import { z } from "zod";
import {
    adminUrlFor,
    backupFilePath,
    createDatabase,
    dbExists,
    dropDatabase,
    latestBackup,
    listBackups,
    parseDbUrl,
    pgDump,
    pgRestore,
    tableRowCounts,
    withClient,
} from "@/tui/lib/tui-db";
import { portalDbUrl } from "@/db/client";
import type { ActionDefinition } from "../types";

const slug = z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/)
    .describe("Portal slug");

export const backupActions: ActionDefinition[] = [
    {
        id: "backup.create",
        group: "backup",
        summary: "Create a verified plain-SQL backup for a portal",
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
            const out = await pgDump(url, backupFilePath(slug, tag || "manual"));
            if (!out.ok) throw new Error(`Backup failed: ${out.out}`);
            return { slug, bytes: out.bytes, file: latestBackup(slug)?.file ?? null };
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
        summary: "Verify a backup has a valid SQL header and non-trivial size",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug, file: z.string().optional() }),
        run: async ({ slug, file }) => {
            const entries = listBackups(slug);
            const chosen = file ? entries.find((e) => e.file === file) : entries[0];
            if (!chosen) throw new Error("Backup not found");
            const fd = fs.openSync(chosen.abs, "r");
            const header = Buffer.alloc(64);
            const read = fs.readSync(fd, header, 0, 64, 0);
            fs.closeSync(fd);
            const text = header.subarray(0, read).toString("utf8");
            const valid =
                chosen.bytes > 100 &&
                /PostgreSQL database dump|CREATE TABLE|SET statement_timeout/i.test(text);
            return { slug, file: chosen.file, bytes: chosen.bytes, valid };
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
            return { slug, file: chosen?.file ?? null, bytes: chosen?.bytes ?? 0 };
        },
        run: async ({ slug, file }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            const entries = listBackups(slug);
            const chosen = file ? entries.find((e) => e.file === file) : entries[0];
            if (!chosen || chosen.bytes < 100) throw new Error("No valid backup to restore");
            const pre = await pgDump(url, backupFilePath(slug, "pre-restore"));
            if (!pre.ok) throw new Error("Refusing to restore: pre-restore backup failed");
            const result = await pgRestore(url, chosen.abs);
            if (result.code !== 0) throw new Error(`Restore failed: ${result.out}`);
            return { slug, restored: chosen.file, preRestoreBytes: pre.bytes };
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
            try {
                const r = await pgRestore(scratchUrl.toString(), backup.abs);
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
        run: async ({ slug }) => {
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
