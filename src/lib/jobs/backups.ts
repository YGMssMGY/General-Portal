import fsp from "node:fs/promises";
import type { Job, PgBoss } from "pg-boss";
import { config } from "@/config";
import { listPortals } from "@/lib/deployment";
import { logger } from "@/lib/logger";
import { portalDbUrl } from "@/db/client";
import { backupEncryptionKey, backupFilePath, encryptDump, pgDump } from "@/tui/lib/tui-db";

export const BACKUP_QUEUE = "scheduled-backup";
export const BACKUP_CRON = "0 2 * * *";

interface BackupJobData {
    portal: string;
}

export function validateBackupEncryptionKey(): void {
    if (!config.backupKey) return;
    try {
        backupEncryptionKey();
    } catch (e) {
        logger.fatal({ err: e }, "invalid BACKUP_ENCRYPTION_KEY; backups will fail closed");
        throw e;
    }
}

async function handle(job: Job<BackupJobData>): Promise<void> {
    const slug = job.data.portal;
    const url = portalDbUrl(slug);
    if (!url) return;
    const staged = backupFilePath(slug, "scheduled");
    const dump = await pgDump(url, staged);
    if (!dump.ok || dump.bytes < 100) throw new Error("pg_dump failed");
    const key = backupEncryptionKey();
    let sealed: Awaited<ReturnType<typeof encryptDump>> | null = null;
    if (key) {
        try {
            sealed = await encryptDump(staged, key);
        } catch (e) {
            await fsp.rm(staged, { force: true }).catch(() => undefined);
            throw e;
        }
    }
    if (sealed) {
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
}

export async function registerBackupJobs(boss: PgBoss): Promise<void> {
    validateBackupEncryptionKey();
    await boss.createQueue(BACKUP_QUEUE);
    for (const portal of listPortals()) {
        await boss.schedule(
            BACKUP_QUEUE,
            BACKUP_CRON,
            { portal: portal.slug } satisfies BackupJobData,
            { key: `backup-${portal.slug}`, tz: "Asia/Shanghai" },
        );
    }
    await boss.work<BackupJobData>(BACKUP_QUEUE, async (jobs) => {
        for (const job of jobs) await handle(job);
    });
}
