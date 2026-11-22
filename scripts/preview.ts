import os from "node:os";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { parse, stringify } from "yaml";
import { normalizeSlug } from "../src/db/client";
import { adminUrlFor, createDatabase, dbExists, parseDbUrl, runTsx } from "../src/tui/lib/tui-db";

interface PreviewPreset {
    portals: Array<{
        name: string;
        description?: string;
        modules?: string[];
        roles?: string[];
    }>;
}

function dbEnvKey(slug: string): string {
    return `DATABASE_URL_${slug.toUpperCase().replace(/-/g, "_")}`;
}

async function main(): Promise<void> {
    const number = process.env.PR_NUMBER ?? process.env.GITHUB_EVENT_NUMBER ?? "";
    const slug = normalizeSlug(process.env.PREVIEW_SLUG ?? `pr-${number}`);
    if (!slug) throw new Error("Set PREVIEW_SLUG to a valid portal slug");
    const url = process.env.PREVIEW_DB_URL;
    if (!url) throw new Error("PREVIEW_DB_URL is required");

    const { dbName } = parseDbUrl(url);
    if (!dbName) throw new Error("PREVIEW_DB_URL must include a database name");
    const adminUrl = adminUrlFor(url);
    const exists = await dbExists(adminUrl, dbName);
    if (exists === null) throw new Error("Cannot connect to the preview database server");
    if (!exists) {
        await createDatabase(adminUrl, dbName);
        console.log(`created database ${dbName}`);
    }

    const migrate = await runTsx("scripts/migrate.ts", [], { MIGRATE_URL: url });
    if (migrate.code !== 0) throw new Error(`migration failed: ${migrate.out}`);

    const presetPath = path.resolve(process.cwd(), "deployments", "presets", "general.yaml");
    const preset = parse(await readFile(presetPath, "utf8")) as PreviewPreset;
    const source = preset.portals[0];
    if (!source) throw new Error(`No portal in ${presetPath}`);
    const settings: Record<string, boolean> = {};
    for (const mod of source.modules ?? []) settings[mod] = true;
    const pack = {
        workspace: {
            name: source.name,
            slug,
            description: source.description,
            settings,
        },
        roles: (source.roles ?? []).map((name) => ({ name, isSystem: true })),
    };
    const packPath = path.join(os.tmpdir(), `preview-pack-${slug}.yaml`);
    await writeFile(packPath, stringify(pack), "utf8");

    const seed = await runTsx("scripts/seed.ts", [slug, packPath], {
        [dbEnvKey(slug)]: url,
    });
    if (seed.code !== 0) throw new Error(`seed failed: ${seed.out}`);

    const baseUrl = process.env.APP_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;
    console.log(`preview portal: ${slug}`);
    console.log(`health url: ${baseUrl.replace(/\/$/, "")}/api/health`);
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
