import { z } from "zod";
import { appliedMigrations, migrationFiles, pendingMigrations, runTsx } from "@/tui/lib/tui-db";
import { listPortalSlugs, portalDbUrl } from "@/db/client";
import type { ActionDefinition } from "../types";

const slug = z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/)
    .optional()
    .describe("Portal slug (omit for all)");

function targets(input: { slug?: string }): Array<{ slug: string; url: string }> {
    return listPortalSlugs()
        .filter((s) => input.slug === undefined || input.slug === s)
        .map((s) => ({ slug: s, url: portalDbUrl(s) ?? "" }))
        .filter((x) => x.url !== "");
}

export const migrateActions: ActionDefinition[] = [
    {
        id: "migrate.status",
        group: "migrate",
        summary: "List applied and pending migrations per portal",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug }),
        run: async (input) => {
            const total = migrationFiles().length;
            return Promise.all(
                targets(input).map(async (t) => {
                    const applied = (await appliedMigrations(t.url)) ?? [];
                    return {
                        slug: t.slug,
                        applied: applied.length,
                        total,
                        pending: migrationFiles().filter((f) => !applied.includes(f)),
                    };
                }),
            );
        },
    },
    {
        id: "migrate.plan",
        group: "migrate",
        summary: "Dry-run: show exactly which migrations would be applied",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug }),
        run: async (input) => ({
            dryRun: true,
            portals: await Promise.all(
                targets(input).map(async (t) => ({
                    slug: t.slug,
                    pending: (await pendingMigrations(t.url)) ?? [],
                })),
            ),
        }),
    },
    {
        id: "migrate.apply",
        group: "migrate",
        summary: "Apply all pending migrations to one or all portals",
        scopes: ["ops:deploy"],
        destructive: false,
        params: z.object({ slug }),
        run: async (input) => {
            const results: Array<{ slug: string; ok: boolean; applied: string[]; out: string }> =
                [];
            for (const t of targets(input)) {
                const pending = (await pendingMigrations(t.url)) ?? [];
                if (pending.length === 0) {
                    results.push({ slug: t.slug, ok: true, applied: [], out: "up to date" });
                    continue;
                }
                const r = await runTsx("scripts/migrate.ts", [t.url]);
                results.push({
                    slug: t.slug,
                    ok: r.code === 0,
                    applied: pending,
                    out: r.out.slice(-4000),
                });
            }
            return results;
        },
    },
    {
        id: "migrate.check",
        group: "migrate",
        summary: "Detect schema drift between migration files and the applied ledger",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const files = new Set(migrationFiles());
            return Promise.all(
                listPortalSlugs().map(async (s) => {
                    const url = portalDbUrl(s);
                    if (!url) return { slug: s, drift: "no-env" };
                    const applied = (await appliedMigrations(url)) ?? [];
                    const unknown = applied.filter((f) => !files.has(f));
                    const pending = [...files].filter((f) => !applied.includes(f));
                    return {
                        slug: s,
                        drift: unknown.length || pending.length ? "drift" : "clean",
                        unknown,
                        pending,
                    };
                }),
            );
        },
    },
];
