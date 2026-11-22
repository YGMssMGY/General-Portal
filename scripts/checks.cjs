/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mode = process.argv[2] ?? "all";

function flatten(obj, prefix = "", out = new Set()) {
    for (const [key, value] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value)) flatten(value, full, out);
        else out.add(full);
    }
    return out;
}

function i18nCheck() {
    const dir = path.join(root, "messages");
    const locales = ["en-US", "zh-CN", "de-DE", "fr-FR", "es-ES"];
    const keys = new Map();
    for (const l of locales) {
        keys.set(l, flatten(JSON.parse(fs.readFileSync(path.join(dir, `${l}.json`), "utf8"))));
    }
    const baseline = keys.get("en-US");
    let failed = false;
    for (const l of locales) {
        const have = keys.get(l);
        const missing = [...baseline].filter((k) => !have.has(k));
        const extra = [...have].filter((k) => !baseline.has(k));
        if (missing.length || extra.length) {
            failed = true;
            console.error(`FAIL ${l}: missing=${missing.length} extra=${extra.length}`);
            for (const k of missing.slice(0, 10)) console.error(`  missing ${k}`);
        } else {
            console.log(`PASS ${l}: ${have.size} keys`);
        }
    }
    return !failed;
}

function seoCheck() {
    const required = [
        "src/app/sitemap.ts",
        "src/app/robots.ts",
        "src/app/manifest.ts",
        "src/app/opengraph-image.tsx",
        "src/app/twitter-image.tsx",
        "src/components/JsonLd.tsx",
        "README.md",
        "LICENSE",
    ];
    let ok = true;
    for (const rel of required) {
        const exists = fs.existsSync(path.join(root, rel));
        console.log(`${exists ? "PASS" : "FAIL"} ${rel}`);
        if (!exists) ok = false;
    }
    const landing = fs.readFileSync(path.join(root, "src/app/page.tsx"), "utf8");
    const hasMetadata = /export const metadata/.test(landing);
    console.log(`${hasMetadata ? "PASS" : "FAIL"} landing metadata`);
    if (!hasMetadata) ok = false;
    const noSelfFetch = !/fetch\(`\$\{proto\}/.test(landing);
    console.log(`${noSelfFetch ? "PASS" : "FAIL"} landing does not self-fetch`);
    if (!noSelfFetch) ok = false;
    return ok;
}

function securityCheck() {
    const banned = [
        { re: /dangerouslySetInnerHTML/, name: "dangerouslySetInnerHTML" },
        { re: /\beval\s*\(/, name: "eval(" },
        { re: /new Function\s*\(/, name: "new Function(" },
        { re: /sql\.raw\s*\(/, name: "sql.raw (unparameterized SQL)" },
    ];
    const skip = new Set(["node_modules", ".next", ".git", "test-results", "uploads", ".backups"]);
    let violations = 0;
    function walk(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (skip.has(entry.name)) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(full);
            else if (entry.name === "checks.cjs") continue;
            else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
                const text = fs.readFileSync(full, "utf8");
                for (const b of banned) {
                    if (b.re.test(text)) {
                        violations++;
                        console.error(`FAIL ${path.relative(root, full)}: ${b.name}`);
                    }
                }
            }
        }
    }
    walk(path.join(root, "src"));
    walk(path.join(root, "scripts"));
    console.log(
        violations === 0 ? "PASS no banned security patterns" : `FAIL ${violations} violations`,
    );
    return violations === 0;
}

function perfCheck() {
    const url = process.env.MIGRATE_URL;
    if (!url) {
        console.log("SKIP perf:check requires MIGRATE_URL");
        return true;
    }
    const { Client } = require("pg");
    const queries = [
        "EXPLAIN ANALYZE SELECT id FROM workspaces WHERE slug = 'developers' LIMIT 1",
        'EXPLAIN ANALYZE SELECT id FROM tasks WHERE "workspaceId" = (SELECT id FROM workspaces LIMIT 1) AND "deletedAt" IS NULL ORDER BY "createdAt" DESC, id DESC LIMIT 20',
    ];
    (async () => {
        const c = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
        await c.connect();
        let ok = true;
        for (const q of queries) {
            const t = Date.now();
            const r = await c.query(q);
            const ms = Date.now() - t;
            const plan = r.rows.map((x) => x["QUERY PLAN"]).join("\n");
            const seqScan = /Seq Scan/.test(plan);
            console.log(
                `${seqScan ? "WARN" : "PASS"} ${ms}ms ${seqScan ? "sequential scan" : "indexed"}`,
            );
            if (seqScan) ok = false;
        }
        await c.end();
        process.exitCode = ok ? 0 : 1;
    })().catch((e) => {
        console.error("FAIL perf:check", e.message);
        process.exitCode = 1;
    });
    return true;
}

const checks = {
    i18n: i18nCheck,
    seo: seoCheck,
    security: securityCheck,
};
let allOk = true;
if (mode === "all") {
    for (const fn of Object.values(checks)) allOk = fn() && allOk;
    allOk = perfCheck() && allOk;
} else if (checks[mode]) {
    allOk = checks[mode]() && allOk;
} else if (mode === "perf") {
    allOk = perfCheck() && allOk;
} else {
    console.error(`Unknown check: ${mode}`);
    allOk = false;
}
process.exitCode = allOk ? 0 : 1;
