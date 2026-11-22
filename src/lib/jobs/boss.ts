import { PgBoss } from "pg-boss";
import { config } from "@/config";
import { listPortalSlugs, portalDbUrl } from "@/db/client";
import { logger } from "@/lib/logger";

let boss: PgBoss | null = null;
let starting: Promise<PgBoss> | null = null;

export function connectionString(): string {
    if (config.bossUrl) return config.bossUrl;
    const first = listPortalSlugs()[0];
    const url = first ? portalDbUrl(first) : undefined;
    if (!url)
        throw new Error(
            "pg-boss has no database: set PG_BOSS_URL or define a DATABASE_URL_<PORTAL>",
        );
    return url;
}

async function boot(): Promise<PgBoss> {
    try {
        const next = new PgBoss(connectionString());
        next.on("error", (err) => logger.error({ err }, "pg-boss error"));
        await next.start();
        boss = next;
        return next;
    } catch (err) {
        starting = null;
        throw err;
    }
}

export async function getBoss(): Promise<PgBoss> {
    if (boss) return boss;
    if (!starting) starting = boot();
    return starting;
}

export async function stopBoss(): Promise<void> {
    starting = null;
    if (!boss) return;
    const next = boss;
    boss = null;
    await next.stop();
}
