import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { parse } from "yaml";
import { deploymentConfigSchema, type DeploymentConfig } from "@/lib/deployment/schema";

const DEPLOYMENT_FILE = path.resolve(process.cwd(), "deployment.yaml");
const EXAMPLE_FILE = path.resolve(process.cwd(), "deployment.example.local.yaml");
const SEED_PACKS_DIR = path.resolve(process.cwd(), "deployments", "seed-packs");
const UPLOADS_DIR = path.resolve(process.cwd(), process.env.UPLOADS_DIR ?? "./uploads");

const EXAMPLE_CONFIG = `version: 1
deployment:
    id: local-portal
    environment: local
    baseUrl: http://localhost:3000
defaults:
    locale: en-US
    timezone: Asia/Shanghai
    theme:
        primary: "#0f62fe"
        radius: 5
portals:
    - slug: example
      name: Example Portal
      category: general
      description: A minimal example portal configuration.
      branding:
          logo: /example.png
          favicon: /example.png
          primary: "#0f62fe"
      db:
          envVar: DATABASE_URL_EXAMPLE
      auth:
          providers: [password]
          allowedDomains: []
      modules: [dashboard]
      nav:
          - path: /dashboard
            label: Dashboard
            icon: layout-dashboard
            module: dashboard
      terminology: {}
      roles: [admin, member]
      seedPack: example
      limits:
          uploadMb: 10
          requestsPerMinute: 100
          auditRetentionDays: 365
      features: []
`;

function message(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
}

function loadConfig(): DeploymentConfig {
    return deploymentConfigSchema.parse(parse(fs.readFileSync(DEPLOYMENT_FILE, "utf8")));
}

function seedPackPath(seedPack: string): string {
    const file = seedPack.endsWith(".yaml") ? seedPack : `${seedPack}.yaml`;
    return path.join(SEED_PACKS_DIR, file);
}

function isPostgresUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "postgres:" || url.protocol === "postgresql:";
    } catch {
        return false;
    }
}

function redactUrl(value: string): string {
    try {
        const url = new URL(value);
        return `${url.protocol}//${url.host}${url.pathname}`;
    } catch {
        return "<invalid URL>";
    }
}

function makeClient(url: string): Client {
    return new Client({
        connectionString: url,
        connectionTimeoutMillis: 5000,
        query_timeout: 5000,
        statement_timeout: 5000,
    });
}

function show(value: string | null): string {
    return value === null ? "(null)" : value;
}

async function runCheck(): Promise<boolean> {
    console.log("Deployment configuration check");
    console.log("==============================");
    console.log("");
    let config: DeploymentConfig;
    try {
        config = loadConfig();
    } catch (err) {
        console.log(`FAIL: unable to read or validate deployment.yaml: ${message(err)}`);
        console.log("");
        console.log("Summary: FAIL");
        return false;
    }
    let failures = 0;
    for (const portal of config.portals) {
        const envValue = process.env[portal.db.envVar];
        const envSet = Boolean(envValue);
        const urlValid = envValue ? isPostgresUrl(envValue) : false;
        const seedFound = fs.existsSync(seedPackPath(portal.seedPack));
        if (!envSet || !urlValid) failures += 1;
        if (!seedFound) failures += 1;
        console.log(`Portal: ${portal.slug}`);
        console.log(`  Name: ${portal.name}`);
        console.log(`  Modules: ${portal.modules.length}`);
        console.log(`  Nav entries: ${portal.nav.length}`);
        console.log(`  Providers: ${portal.auth.providers.join(", ") || "(none)"}`);
        console.log(`  Database env ${portal.db.envVar}: ${envSet ? "set" : "missing"}`);
        console.log(`  Database URL: ${!envSet ? "not checked" : urlValid ? "valid" : "invalid"}`);
        console.log(`  Seed pack ${portal.seedPack}: ${seedFound ? "found" : "missing"}`);
        console.log("");
    }
    if (failures === 0) {
        console.log(`Summary: PASS (${config.portals.length} portal(s) checked)`);
    } else {
        console.log(
            `Summary: FAIL (${failures} issue(s) across ${config.portals.length} portal(s))`,
        );
    }
    return failures === 0;
}

async function runInit(): Promise<void> {
    deploymentConfigSchema.parse(parse(EXAMPLE_CONFIG));
    if (fs.existsSync(EXAMPLE_FILE)) {
        console.log(`Already exists: ${path.basename(EXAMPLE_FILE)} (not overwritten)`);
    } else {
        fs.writeFileSync(EXAMPLE_FILE, EXAMPLE_CONFIG, "utf8");
        console.log(`Created: ${path.basename(EXAMPLE_FILE)}`);
    }
    console.log("deployment.yaml was not modified.");
    console.log("Next steps:");
    console.log("  1. Review deployment.example.local.yaml and adjust it for your environment.");
    console.log("  2. Copy it to deployment.yaml, or point DEPLOYMENT_FILE at it.");
    console.log("  3. Set DATABASE_URL_EXAMPLE in the environment for the portal database.");
    console.log("  4. Run: pnpm exec tsx scripts/config.ts check");
}

async function runDiff(): Promise<void> {
    console.log("Configuration versus database differences");
    console.log("=======================================");
    console.log("");
    const config = loadConfig();
    let differences = 0;
    for (const portal of config.portals) {
        console.log(`Portal: ${portal.slug}`);
        const url = process.env[portal.db.envVar];
        if (!url) {
            console.log(`  Not checked: ${portal.db.envVar} is missing`);
            console.log("");
            continue;
        }
        const client = makeClient(url);
        try {
            await client.connect();
            const result = await client.query<{
                name: string;
                description: string | null;
                logoUrl: string | null;
            }>('SELECT name, description, "logoUrl" FROM workspaces WHERE slug = $1 LIMIT 1', [
                portal.slug,
            ]);
            const row = result.rows[0];
            const pairs: Array<[string, string, string | null]> = [
                ["name", portal.name, row?.name ?? null],
                ["description", portal.description, row?.description ?? null],
                ["branding.logo", portal.branding.logo, row?.logoUrl ?? null],
            ];
            const changed = pairs.filter(([, expected, actual]) => expected !== (actual ?? ""));
            if (changed.length === 0) {
                console.log("  No differences");
            } else {
                for (const [field, expected, actual] of changed) {
                    console.log(`  ${field}: YAML=${show(expected)} DB=${show(actual)}`);
                }
                differences += changed.length;
            }
        } catch (err) {
            console.log(`  Not checked: database error (${message(err)})`);
        } finally {
            await client.end();
        }
        console.log("");
    }
    console.log(`Summary: ${differences} difference(s) found`);
}

async function runDoctor(): Promise<boolean> {
    console.log("Deployment doctor");
    console.log("================");
    console.log("");
    let healthy = await runCheck();
    const config = loadConfig();
    console.log("Database connectivity");
    console.log("---------------------");
    for (const portal of config.portals) {
        const url = process.env[portal.db.envVar];
        if (!url) {
            console.log(`  ${portal.slug}: skipped (${portal.db.envVar} missing)`);
            continue;
        }
        const client = makeClient(url);
        try {
            await client.connect();
            await client.query("SELECT 1");
            let migrations: string;
            try {
                const result = await client.query<{ count: string }>(
                    "SELECT count(*)::text AS count FROM public.schema_migrations",
                );
                migrations = result.rows[0]?.count ?? "0";
            } catch {
                migrations = "0 (table missing)";
            }
            console.log(
                `  ${portal.slug}: reachable (${redactUrl(url)}), migrations applied: ${migrations}`,
            );
        } catch (err) {
            console.log(`  ${portal.slug}: unreachable (${message(err)})`);
            healthy = false;
        } finally {
            await client.end();
        }
    }
    console.log("");
    console.log("Filesystem");
    console.log("----------");
    let uploadsOk = true;
    try {
        fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
    } catch {
        uploadsOk = false;
    }
    console.log(`  Uploads directory (${UPLOADS_DIR}): ${uploadsOk ? "writable" : "not writable"}`);
    if (!uploadsOk) healthy = false;
    console.log("");
    console.log(`Report: ${healthy ? "HEALTHY" : "UNHEALTHY"}`);
    return healthy;
}

async function main(): Promise<void> {
    const command = process.argv[2];
    switch (command) {
        case "check": {
            const passed = await runCheck();
            if (!passed) process.exitCode = 1;
            return;
        }
        case "init":
            await runInit();
            return;
        case "diff":
            await runDiff();
            return;
        case "doctor": {
            const healthy = await runDoctor();
            if (!healthy) process.exitCode = 1;
            return;
        }
        default:
            console.error("Usage: tsx scripts/config.ts <check|init|diff|doctor>");
            process.exitCode = 1;
    }
}

main().catch((err: unknown) => {
    console.error(message(err));
    process.exitCode = 1;
});
