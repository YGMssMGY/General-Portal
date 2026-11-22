import { z } from "zod";
import {
    adminUrlFor,
    backupFilePath,
    createDatabase,
    dbExists,
    dropDatabase,
    getSiteInfo,
    isSafeIdentifier,
    latestBackup,
    parseDbUrl,
    pgDump,
    runTsx,
    sealDumpIfConfigured,
    tableRowCounts,
} from "@/tui/lib/tui-db";
import { getPortal, listPortals } from "@/lib/deployment";
import { closeAllPools, isSingleDbMode, listPortalSlugs, portalDbUrl } from "@/db/client";
import type { ActionDefinition } from "../types";

const slugParam = z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/)
    .describe("Portal slug");
const emailParam = z.string().email().describe("User email");

async function mapLimited<T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let cursor = 0;
    async function worker(): Promise<void> {
        while (cursor < items.length) {
            const i = cursor++;
            out[i] = await fn(items[i]);
        }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
    return out;
}

function yamlBlock(p: ReturnType<typeof getPortal>): string {
    return [
        `    - slug: ${p.slug}`,
        `      name: "${p.name.replace(/"/g, '\\"')}"`,
        `      category: ${p.category}`,
        `      description: "${p.description.replace(/"/g, '\\"')}"`,
        "      branding:",
        `          logo: ${p.branding.logo}`,
        `          favicon: ${p.branding.favicon}`,
        `          primary: ${p.branding.primary}`,
        "      db:",
        `          envVar: ${p.db.envVar}`,
        "      auth:",
        `          providers: [${p.auth.providers.join(", ")}]`,
        `          allowedDomains: [${p.auth.allowedDomains.join(", ")}]`,
        `      modules: [${p.modules.join(", ")}]`,
        `      terminology: {}`,
        `      roles: [${p.roles.join(", ")}]`,
        `      seedPack: ${p.seedPack}`,
    ].join("\n");
}

export const siteActions: ActionDefinition[] = [
    {
        id: "site.list",
        group: "site",
        summary: "List all portals with database, member, migration and backup state",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const slugs = listPortalSlugs();
            const rows = await mapLimited(slugs, 8, async (slug) => {
                const url = portalDbUrl(slug);
                return url ? getSiteInfo(slug, url) : null;
            });
            return rows.filter((r) => r !== null);
        },
    },
    {
        id: "site.show",
        group: "site",
        summary: "Show one portal including its YAML block",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug: slugParam }),
        run: async ({ slug }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            return { ...(await getSiteInfo(slug, url)), yaml: yamlBlock(getPortal(slug)) };
        },
    },
    {
        id: "site.config",
        group: "site",
        summary: "Print the deployment YAML block for a portal",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug: slugParam }),
        run: async ({ slug }) => yamlBlock(getPortal(slug)),
    },
    {
        id: "site.health",
        group: "site",
        summary: "Aggregate health of all portals",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const portals = listPortals();
            const rows = await mapLimited(portals, 8, async (p) => {
                const url = portalDbUrl(p.slug);
                return url
                    ? { ...(await getSiteInfo(p.slug, url)), name: p.name }
                    : { slug: p.slug, name: p.name, workspace: "no-env" };
            });
            return {
                portals: rows,
                configured: portals.length,
                pools: rows.filter((r) => "workspace" in r && r.workspace !== "offline").length,
            };
        },
    },
    {
        id: "site.add",
        group: "site",
        summary: "Provision a new portal database, migrate it and print its YAML block",
        scopes: ["ops:deploy"],
        destructive: false,
        params: z.object({
            slug: slugParam,
            name: z.string().min(1).max(120),
            category: z.string().min(1).max(64).default("general"),
            seedPack: z.string().optional(),
        }),
        run: async ({ slug, name, category, seedPack }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Set DATABASE_URL_${slug.toUpperCase().replace(/-/g, "_")}`);
            const parsed = parseDbUrl(url);
            if (!isSafeIdentifier(parsed.dbName)) throw new Error("Unsafe database name");
            const admin = adminUrlFor(url);
            const exists = await dbExists(admin, parsed.dbName);
            if (exists !== false) throw new Error("Database already exists");
            await createDatabase(admin, parsed.dbName);
            const migrate = await runTsx("scripts/migrate.ts", [url]);
            if (migrate.code !== 0) throw new Error(`Migration failed: ${migrate.out}`);
            let seeded = "skipped";
            if (seedPack) {
                const r = await runTsx("scripts/seed.ts", [slug, seedPack]);
                if (r.code !== 0) throw new Error(`Seed failed: ${r.out}`);
                seeded = seedPack;
            }
            const p = listPortals().find((x) => x.slug === slug);
            return {
                slug,
                name,
                category,
                database: parsed.dbName,
                migrated: true,
                seeded,
                yaml: p
                    ? yamlBlock(p)
                    : `    - slug: ${slug}\n      name: "${name}"\n      category: ${category}`,
                note: "Append the YAML block to deployment.yaml, set the env var, then restart.",
            };
        },
    },
    {
        id: "site.remove",
        group: "site",
        summary: "Drop a portal database after a verified backup and typed confirmation",
        scopes: ["ops:danger"],
        destructive: true,
        confirmField: "slug",
        params: z.object({ slug: slugParam }),
        preview: async ({ slug }) => {
            const url = portalDbUrl(slug);
            if (!url) return { slug, error: "unknown portal" };
            const rows = await tableRowCounts(url, [
                "users",
                "tasks",
                "events",
                "proposals",
                "messages",
                "files",
            ]);
            const backup = latestBackup(slug);
            return {
                slug,
                database: parseDbUrl(url).dbName,
                rows,
                verifiedBackup: backup ? { file: backup.file, bytes: backup.bytes } : null,
                warning: isSingleDbMode()
                    ? "Single-DB mode: physical database drop is refused; use trash/admin data deletion instead."
                    : "All data in this portal database will be permanently deleted.",
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
            if (!backup || backup.bytes < 100) {
                throw new Error("Refusing to drop: no verified backup exists");
            }
            const staged = backupFilePath(slug, "pre-drop");
            const dump = await pgDump(url, staged);
            if (!dump.ok) throw new Error("Refusing to drop: final backup failed");
            const sealed = await sealDumpIfConfigured(staged);
            const parsed = parseDbUrl(url);
            await dropDatabase(adminUrlFor(url), parsed.dbName);
            closeAllPools();
            return {
                slug,
                database: parsed.dbName,
                dropped: true,
                backupBytes: sealed?.bytes ?? dump.bytes,
            };
        },
    },
    {
        id: "site.clone",
        group: "site",
        summary: "Clone a portal database structure and seed it from the source seed pack",
        scopes: ["ops:deploy"],
        destructive: false,
        params: z.object({ source: slugParam, target: slugParam }),
        run: async ({ source, target }) => {
            if (source === target) throw new Error("Source and target must differ");
            const url = portalDbUrl(target);
            if (!url)
                throw new Error(`Set DATABASE_URL_${target.toUpperCase().replace(/-/g, "_")}`);
            const parsed = parseDbUrl(url);
            if (!isSafeIdentifier(parsed.dbName)) throw new Error("Unsafe database name");
            const exists = await dbExists(adminUrlFor(url), parsed.dbName);
            if (exists !== false) throw new Error("Target database already exists");
            await createDatabase(adminUrlFor(url), parsed.dbName);
            const migrate = await runTsx("scripts/migrate.ts", [url]);
            if (migrate.code !== 0) throw new Error(`Migration failed: ${migrate.out}`);
            const pack = getPortal(source).seedPack;
            const seed = await runTsx("scripts/seed.ts", [target, pack]);
            if (seed.code !== 0) throw new Error(`Seed failed: ${seed.out}`);
            return { source, target, database: parsed.dbName, seedPack: pack };
        },
    },
];

export const portalSlugSchema = slugParam;
export const portalEmailSchema = emailParam;
