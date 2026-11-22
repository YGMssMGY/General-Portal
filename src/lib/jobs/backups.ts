import { createCipheriv, createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import type { Job, PgBoss } from "pg-boss";
import { config } from "@/config";
import { listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";
import { portalDbUrl } from "@/db/client";
import { backupFilePath, pgDump } from "@/tui/lib/tui-db";

export const BACKUP_QUEUE = "scheduled-backup";
export const BACKUP_CRON = "0 2 * * *";

interface BackupJobData {
    portal: string;
}

function encryptionKey(): Buffer | null {
    if (!config.backupKey) return null;
    const key = Buffer.from(config.backupKey, "base64");
    return key.length === 32 ? key : null;
}

async function encryptDump(
    source: string,
): Promise<{ path: string; bytes: number; sha256: string }> {
    const key = encryptionKey();
    if (!key) throw new Error("BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    const plain = await fs.readFile(source);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    const header = Buffer.from("GPENC1", "ascii");
    const out = Buffer.concat([header, iv, tag, encrypted]);
    const target = `${source}.enc`;
    await fs.writeFile(target, out, { mode: 0o600 });
    await fs.unlink(source);
    return {
        path: target,
        bytes: out.length,
        sha256: createHash("sha256").update(out).digest("hex"),
    };
}

async function handle(job: Job<BackupJobData>): Promise<void> {
    const slug = job.data.portal;
    const url = portalDbUrl(slug);
    if (!url) return;
    try {
        const staged = backupFilePath(slug, "scheduled");
        const dump = await pgDump(url, staged);
        if (!dump.ok || dump.bytes < 100) throw new Error("pg_dump failed");
        if (config.backupKey) {
            const sealed = await encryptDump(staged);
            logger.info(
                { portal: slug, bytes: sealed.bytes, sha256: sealed.sha256 },
                "encrypted backup complete",
            );
        } else {
            logger.warn(
                { portal: slug, bytes: dump.bytes },
                "scheduled backup stored unencrypted; set BACKUP_ENCRYPTION_KEY",
            );
        }
    } catch (err) {
        logger.error({ err, portal: slug }, "scheduled backup failed");
        throw err;
    }
}

export async function registerBackupJobs(boss: PgBoss): Promise<void> {
    await boss.createQueue(BACKUP_QUEUE);
    for (const portal of listPortals()) {
        await boss.schedule(
            BACKUP_QUEUE,
            BACKUP_CRON,
            { portal: portal.slug } satisfies BackupJobData,
            { key: `backup-${portal.slug}` },
        );
    }
    await boss.work<BackupJobData>(BACKUP_QUEUE, async (jobs) => {
        for (const job of jobs) {
            try {
                await handle(job);
            } catch {
                void 0;
            }
        }
    });
}
