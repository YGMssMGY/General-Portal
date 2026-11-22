import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Client } from "pg";

const execAsync = promisify(exec);

export function loadDotEnv(): void {
    let text = "";
    try {
        text = fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    } catch {
        return;
    }
    for (const raw of text.split("\n")) {
        const line = raw.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq < 1) continue;
        const key = line.slice(0, eq).trim();
        if (!key || process.env[key] !== undefined) continue;
        let val = line.slice(eq + 1).trim();
        if (val.length >= 2 && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        else if (val.length >= 2 && val.startsWith("'") && val.endsWith("'"))
            val = val.slice(1, -1);
        process.env[key] = val;
    }
}

export interface ParsedDbUrl {
    host: string;
    port: number;
    user: string;
    password: string;
    dbName: string;
}

export function parseDbUrl(url: string): ParsedDbUrl {
    const u = new URL(url);
    return {
        host: u.hostname || "localhost",
        port: u.port ? Number(u.port) : 5432,
        user: decodeURIComponent(u.username),
        password: decodeURIComponent(u.password),
        dbName: decodeURIComponent(u.pathname.replace(/^\//, "")),
    };
}

export function adminUrlFor(url: string): string {
    const u = new URL(url);
    u.pathname = "/postgres";
    return u.toString();
}

export function isSafeIdentifier(name: string): boolean {
    return /^[A-Za-z0-9_]+$/.test(name);
}

export async function withClient<T>(url: string, fn: (c: Client) => Promise<T>): Promise<T> {
    const client = new Client({
        connectionString: url,
        connectionTimeoutMillis: 5000,
        statement_timeout: 15000,
    });
    await client.connect();
    try {
        return await fn(client);
    } finally {
        await client.end();
    }
}

export function migrationFiles(): string[] {
    try {
        const dir = path.resolve(process.cwd(), "src", "db", "migrations");
        return fs
            .readdirSync(dir)
            .filter((f) => f.endsWith(".sql"))
            .sort();
    } catch {
        return [];
    }
}

export async function appliedMigrations(url: string): Promise<string[] | null> {
    try {
        return await withClient(url, async (c) => {
            const r = await c.query<{ filename: string }>(
                "SELECT filename FROM public.schema_migrations ORDER BY filename",
            );
            return r.rows.map((row) => row.filename);
        });
    } catch {
        return null;
    }
}

export async function pendingMigrations(url: string): Promise<string[] | null> {
    const files = migrationFiles();
    const applied = await appliedMigrations(url);
    if (applied === null) return null;
    const done = new Set(applied);
    return files.filter((f) => !done.has(f));
}

export function seedPacks(): string[] {
    try {
        const dir = path.resolve(process.cwd(), "deployments", "seed-packs");
        return fs
            .readdirSync(dir)
            .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
            .sort();
    } catch {
        return [];
    }
}

export interface BackupEntry {
    file: string;
    abs: string;
    bytes: number;
    display: string;
}

export function backupDir(slug: string): string {
    return path.resolve(process.cwd(), ".backups", slug);
}

export function listBackups(slug: string): BackupEntry[] {
    let names: string[] = [];
    try {
        names = fs
            .readdirSync(backupDir(slug))
            .filter((f) => f.endsWith(".sql") || f.endsWith(".sql.enc"));
    } catch {
        return [];
    }
    const out: BackupEntry[] = [];
    for (const file of names) {
        try {
            const abs = path.join(backupDir(slug), file);
            const st = fs.statSync(abs);
            out.push({
                file,
                abs,
                bytes: st.size,
                display: `${file} (${formatBytes(st.size)}, ${st.mtime.toLocaleString("en-US")})`,
            });
        } catch {
            continue;
        }
    }
    out.sort((a, b) => (a.file < b.file ? 1 : -1));
    return out;
}

export function latestBackup(slug: string): BackupEntry | null {
    return listBackups(slug)[0] ?? null;
}

export function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function backupFilePath(slug: string, tag: string): string {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return path.join(backupDir(slug), `${stamp}-${tag}.sql`);
}

const GPENC1 = Buffer.from("GPENC1", "ascii");

export function backupEncryptionKey(): Buffer | null {
    const raw = process.env.BACKUP_ENCRYPTION_KEY ?? "";
    if (raw === "") return null;
    const key = Buffer.from(raw, "base64");
    if (key.length !== 32) {
        throw new Error("BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    }
    return key;
}

export async function encryptDump(
    source: string,
    key: Buffer,
): Promise<{ path: string; bytes: number; sha256: string }> {
    const plain = await fsp.readFile(source);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const out = Buffer.concat([GPENC1, iv, cipher.getAuthTag(), encrypted]);
    const target = `${source}.enc`;
    await fsp.writeFile(target, out, { mode: 0o600 });
    await fsp.unlink(source);
    return {
        path: target,
        bytes: out.length,
        sha256: createHash("sha256").update(out).digest("hex"),
    };
}

export async function decryptDump(
    source: string,
    key: Buffer,
): Promise<{ path: string; bytes: number }> {
    const data = await fsp.readFile(source);
    if (data.length < 34 || data.subarray(0, 6).toString("ascii") !== "GPENC1") {
        throw new Error("Not a GPENC1 encrypted backup");
    }
    const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(6, 18));
    decipher.setAuthTag(data.subarray(18, 34));
    const plain = Buffer.concat([decipher.update(data.subarray(34)), decipher.final()]);
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "gp-restore-"));
    const target = path.join(dir, path.basename(source).replace(/\.enc$/, ""));
    await fsp.writeFile(target, plain, { mode: 0o600 });
    return { path: target, bytes: plain.length };
}

export async function sealDumpIfConfigured(
    source: string,
): Promise<{ path: string; bytes: number; sha256: string } | null> {
    const key = backupEncryptionKey();
    if (!key) return null;
    try {
        return await encryptDump(source, key);
    } catch (e) {
        await fsp.rm(source, { force: true }).catch(() => undefined);
        throw e;
    }
}

function shellQuote(s: string): string {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\$/g, "\\$").replace(/`/g, "\\`")}"`;
}

export async function runBin(
    bin: string,
    args: string[],
    extraEnv: Record<string, string> = {},
): Promise<{ code: number; out: string }> {
    try {
        const { stdout, stderr } = await execAsync(
            `${shellQuote(bin)} ${args.map(shellQuote).join(" ")}`,
            {
                cwd: process.cwd(),
                env: { ...process.env, ...extraEnv },
                timeout: 600000,
                maxBuffer: 32 * 1024 * 1024,
            },
        );
        return { code: 0, out: `${stdout}${stderr}`.trim() };
    } catch (e) {
        const err = e as { status?: number; stdout?: string; stderr?: string; message?: string };
        return {
            code: err.status ?? 1,
            out: `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ?? ""}`.trim(),
        };
    }
}

export async function runTsx(
    scriptRel: string,
    args: string[],
    extraEnv: Record<string, string> = {},
): Promise<{ code: number; out: string }> {
    const bin = process.platform === "win32" ? "tsx.cmd" : "tsx";
    const tsxBin = path.join(process.cwd(), "node_modules", ".bin", bin);
    const script = path.join(process.cwd(), scriptRel);
    return runBin(tsxBin, [script, ...args], extraEnv);
}

export async function pgDump(
    url: string,
    outPath: string,
): Promise<{ ok: boolean; bytes: number; out: string }> {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    const r = await runBin("pg_dump", [url, "-f", outPath, "--no-owner"]);
    let bytes = 0;
    try {
        bytes = fs.statSync(outPath).size;
    } catch {
        bytes = 0;
    }
    return { ok: r.code === 0 && bytes > 0, bytes, out: r.out };
}

export async function pgRestore(
    url: string,
    filePath: string,
): Promise<{ code: number; out: string }> {
    return runBin("psql", [url, "-v", "ON_ERROR_STOP=1", "-f", filePath]);
}

export async function dbExists(adminUrl: string, dbName: string): Promise<boolean | null> {
    try {
        return await withClient(adminUrl, async (c) => {
            const r = await c.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
            return r.rows.length > 0;
        });
    } catch {
        return null;
    }
}

export async function createDatabase(adminUrl: string, dbName: string): Promise<void> {
    if (!isSafeIdentifier(dbName)) throw new Error(`Unsafe database name: ${dbName}`);
    await withClient(adminUrl, async (c) => {
        await c.query(`CREATE DATABASE "${dbName}"`);
    });
}

export async function dropDatabase(adminUrl: string, dbName: string): Promise<void> {
    if (!isSafeIdentifier(dbName)) throw new Error(`Unsafe database name: ${dbName}`);
    await withClient(adminUrl, async (c) => {
        await c.query(
            "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
            [dbName],
        );
        await c.query(`DROP DATABASE "${dbName}"`);
    });
}

export interface SiteInfo {
    slug: string;
    workspace: string;
    members: string;
    size: string;
    migrations: string;
    backup: string;
}

export async function getSiteInfo(slug: string, url: string): Promise<SiteInfo> {
    const total = migrationFiles().length;
    const backup = latestBackup(slug);
    const backupLabel = backup ? backup.display : "none";
    try {
        return await withClient(url, async (c) => {
            let workspace = "missing";
            let members = "—";
            try {
                const ws = await c.query<{ id: string; name: string }>(
                    "SELECT id, name FROM workspaces WHERE slug = $1 LIMIT 1",
                    [slug],
                );
                if (ws.rows[0]) {
                    workspace = ws.rows[0].name;
                    const m = await c.query<{ count: string }>(
                        'SELECT COUNT(*) AS count FROM memberships WHERE "workspaceId" = $1',
                        [ws.rows[0].id],
                    );
                    members = m.rows[0]?.count ?? "—";
                }
            } catch {
                workspace = "missing";
            }
            let migrations = `none/${total}`;
            try {
                const a = await c.query<{ count: string }>(
                    "SELECT COUNT(*) AS count FROM public.schema_migrations",
                );
                migrations = `${a.rows[0]?.count ?? 0}/${total}`;
            } catch {
                migrations = `none/${total}`;
            }
            let size = "—";
            try {
                const s = await c.query<{ size: string }>(
                    "SELECT pg_size_pretty(pg_database_size(current_database())) AS size",
                );
                size = s.rows[0]?.size ?? "—";
            } catch {
                size = "—";
            }
            return { slug, workspace, members, size, migrations, backup: backupLabel };
        });
    } catch {
        return {
            slug,
            workspace: "offline",
            members: "—",
            size: "—",
            migrations: `?/${total}`,
            backup: backupLabel,
        };
    }
}

export async function tableRowCounts(
    url: string,
    tables: string[],
): Promise<Array<{ table: string; count: string }>> {
    const out: Array<{ table: string; count: string }> = [];
    try {
        await withClient(url, async (c) => {
            for (const table of tables) {
                if (!isSafeIdentifier(table)) {
                    out.push({ table, count: "—" });
                    continue;
                }
                try {
                    const r = await c.query<{ count: string }>(
                        `SELECT COUNT(*) AS count FROM "${table}"`,
                    );
                    out.push({ table, count: r.rows[0]?.count ?? "—" });
                } catch {
                    out.push({ table, count: "—" });
                }
            }
        });
    } catch {
        for (const table of tables) out.push({ table, count: "—" });
    }
    return out;
}
