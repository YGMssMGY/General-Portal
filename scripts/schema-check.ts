import { Client } from "pg";
import { isTable } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema";

type ColumnRow = {
    table_name: string;
    column_name: string;
    data_type: string;
};

type IndexRow = { indexname: string };

const LEGACY_COLUMNS = new Set(["id", "userId", "workspaceId"]);

function isIdColumn(name: string): boolean {
    return name.endsWith("Id") || name.endsWith("id");
}

async function main(): Promise<void> {
    const url = process.argv[2] ?? process.env.MIGRATE_URL;
    if (!url) {
        console.error("Usage: tsx scripts/schema-check.ts <connectionString>");
        process.exit(1);
    }
    const client = new Client({ connectionString: url });
    const problems: string[] = [];
    const legacyReported = new Set<string>();
    await client.connect();
    try {
        const [columnRows, indexRows] = await Promise.all([
            client.query<ColumnRow>(
                "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = $1",
                ["public"],
            ),
            client.query<IndexRow>("SELECT indexname FROM pg_indexes WHERE schemaname = $1", [
                "public",
            ]),
        ]);
        const actualTypes = new Map<string, string>();
        for (const row of columnRows.rows) {
            actualTypes.set(`${row.table_name}.${row.column_name}`, row.data_type);
        }
        const actualIndexes = new Set(indexRows.rows.map((row) => row.indexname));

        for (const [key, dataType] of actualTypes) {
            const columnName = key.slice(key.indexOf(".") + 1);
            if (LEGACY_COLUMNS.has(columnName) && dataType !== "uuid") {
                problems.push(
                    `0000 legacy conversion drift: ${key} is ${dataType}, expected uuid (do not rewrite 0000; add a follow-up migration)`,
                );
                legacyReported.add(key);
            }
        }

        for (const value of Object.values(schema)) {
            if (!isTable(value)) continue;
            const cfg = getTableConfig(value as PgTable);
            for (const column of cfg.columns) {
                if (!isIdColumn(column.name) || column.getSQLType() !== "uuid") continue;
                const key = `${cfg.name}.${column.name}`;
                if (legacyReported.has(key)) continue;
                const actual = actualTypes.get(key);
                if (actual === "uuid") continue;
                problems.push(`${key} is ${actual ?? "missing"}, expected uuid`);
            }
            for (const index of cfg.indexes) {
                const name = index.config.name;
                if (name && !actualIndexes.has(name)) {
                    problems.push(`index ${name} declared in schema but missing in database`);
                }
            }
        }
    } finally {
        await client.end();
    }
    if (problems.length > 0) {
        console.error(`Schema check failed (${problems.length}):`);
        for (const problem of problems) console.error(`- ${problem}`);
        process.exit(1);
    }
    console.log("Schema check passed");
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
