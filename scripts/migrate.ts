import { Client } from "pg";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BREAKPOINT = "--> statement-breakpoint";

function splitStatements(sql: string): string[] {
    const out: string[] = [];
    let cur: string[] = [];
    const push = () => {
        const s = cur.join("\n").trim();
        if (s.length > 0) out.push(s);
        cur = [];
    };
    for (const line of sql.replace(/\r\n/g, "\n").split("\n")) {
        if (line.trim() === BREAKPOINT) push();
        else cur.push(line);
    }
    push();
    return out;
}

async function main(): Promise<void> {
    const url = process.argv[2] ?? process.env.MIGRATE_URL;
    if (!url) {
        console.error("Usage: tsx scripts/migrate.ts <connectionString>");
        process.exit(1);
    }
    const dir = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "..",
        "src",
        "db",
        "migrations",
    );
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
        await client.query(
            "CREATE TABLE IF NOT EXISTS public.schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())",
        );
        const applied = await client.query<{ filename: string }>(
            "SELECT filename FROM public.schema_migrations",
        );
        const done = new Set(applied.rows.map((r) => r.filename));
        for (const file of files) {
            if (done.has(file)) {
                console.log(`skipped: ${file} (already applied)`);
                continue;
            }
            const sql = await readFile(path.join(dir, file), "utf8");
            const statements = splitStatements(sql);
            await client.query("BEGIN");
            try {
                let n = 0;
                for (const stmt of statements) {
                    n += 1;
                    try {
                        await client.query(stmt);
                    } catch (err) {
                        console.error(`failed: ${file} statement ${n}: ${stmt}`);
                        throw err;
                    }
                }
                await client.query("INSERT INTO public.schema_migrations (filename) VALUES ($1)", [
                    file,
                ]);
                await client.query("COMMIT");
                console.log(`applied: ${file} (${statements.length} statements)`);
            } catch (err) {
                await client.query("ROLLBACK");
                throw err;
            }
        }
    } finally {
        await client.end();
    }
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
