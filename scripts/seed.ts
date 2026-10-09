import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { normalizeSlug, portalDbUrl } from "../src/db/client";
import { DEFAULT_ROLES, getDefaultPermissions } from "../src/lib/permissions";

interface PackRole {
    name: string;
    description?: string;
    isSystem?: boolean;
}

interface PackUser {
    email: string;
    name: string;
    role?: string;
}

interface PackTask {
    title: string;
    description?: string;
    status?: string;
    priority?: number;
    dueDate?: string;
    assigneeEmail?: string;
}

interface PackEvent {
    title: string;
    description?: string;
    startDate: string;
    endDate?: string;
    location?: string;
    status?: string;
    isPublic?: boolean;
}

interface PackTemplate {
    title: string;
    description: string;
    category?: string;
}

interface PackTransaction {
    amount: number | string;
    type: string;
    category?: string;
    description?: string;
    date?: string;
}

interface PackBudget {
    category: string;
    amount: number | string;
    fiscalYear: number;
    status?: string;
    description?: string;
}

interface Pack {
    workspace: {
        name: string;
        slug: string;
        description?: string;
        settings?: Record<string, boolean>;
    };
    roles?: PackRole[];
    users?: PackUser[];
    sampleTasks?: PackTask[];
    sampleEvents?: PackEvent[];
    proposalTemplates?: PackTemplate[];
    sampleTransactions?: PackTransaction[];
    budgetAllocations?: PackBudget[];
}

function toCents(v: number | string): number {
    const n = typeof v === "number" ? v : Number.parseFloat(v);
    if (!Number.isFinite(n)) throw new Error(`Invalid money value: ${v}`);
    return Math.round(n * 100);
}

function resolveDate(v: string | number | Date): Date {
    if (v instanceof Date) return v;
    if (typeof v === "number") return new Date(v);
    const rel = /^[+-]?\d+d$/.exec(v.trim());
    if (rel) return new Date(Date.now() + Number.parseInt(v.trim().slice(0, -1), 10) * 86400000);
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new Error(`Invalid date value: ${v}`);
    return d;
}

async function main(): Promise<void> {
    const rawSlug = process.argv[2];
    if (!rawSlug) {
        console.error("Usage: tsx scripts/seed.ts <portalSlug> [packFile]");
        process.exit(1);
    }
    const slug = normalizeSlug(rawSlug);
    if (!slug) {
        console.error(`Invalid portal slug: ${rawSlug}`);
        process.exit(1);
    }
    const url = portalDbUrl(slug);
    if (!url) {
        console.error(
            `Unknown portal "${slug}": set DATABASE_URL_${slug.toUpperCase().replace(/-/g, "_")}`,
        );
        process.exit(1);
    }
    const packArg = process.argv[3] ?? path.join("deployments", "seed-packs", `${slug}.yaml`);
    const pack = parse(await readFile(path.resolve(process.cwd(), packArg), "utf8")) as Pack;
    if (!pack.workspace?.slug || !pack.workspace?.name)
        throw new Error(`Invalid pack: missing workspace.name/slug`);
    const pool = new Pool({ connectionString: url });
    const counts = {
        workspaces: 0,
        roles: 0,
        users: 0,
        memberships: 0,
        tasks: 0,
        events: 0,
        templates: 0,
        transactions: 0,
        budgets: 0,
    };
    try {
        const wsFound = await pool.query<{ id: string }>(
            "SELECT id FROM workspaces WHERE slug = $1 LIMIT 1",
            [pack.workspace.slug],
        );
        let workspaceId: string;
        if (wsFound.rows[0]) {
            workspaceId = wsFound.rows[0].id;
            await pool.query(
                "UPDATE workspaces SET name = $2, description = $3, settings = $4::jsonb WHERE id = $1",
                [
                    workspaceId,
                    pack.workspace.name,
                    pack.workspace.description ?? null,
                    JSON.stringify(pack.workspace.settings ?? {}),
                ],
            );
        } else {
            const wsNew = await pool.query<{ id: string }>(
                "INSERT INTO workspaces (name, slug, description, settings) VALUES ($1, $2, $3, $4::jsonb) RETURNING id",
                [
                    pack.workspace.name,
                    pack.workspace.slug,
                    pack.workspace.description ?? null,
                    JSON.stringify(pack.workspace.settings ?? {}),
                ],
            );
            workspaceId = wsNew.rows[0].id;
            counts.workspaces = 1;
        }
        const roleDefs: PackRole[] =
            pack.roles && pack.roles.length > 0
                ? pack.roles
                : DEFAULT_ROLES.map((r) => ({
                      name: r.name,
                      description: r.description,
                      isSystem: r.isSystem,
                  }));
        const roleIds = new Map<string, string>();
        for (const r of roleDefs) {
            const found = await pool.query<{ id: string }>(
                'SELECT id FROM roles WHERE "workspaceId" = $1 AND name = $2 LIMIT 1',
                [workspaceId, r.name],
            );
            const perms = JSON.stringify(getDefaultPermissions(r.name));
            if (found.rows[0]) {
                roleIds.set(r.name, found.rows[0].id);
                await pool.query(
                    'UPDATE roles SET description = $3, permissions = $4::jsonb, "isSystem" = $5 WHERE id = $1 AND "workspaceId" = $2',
                    [
                        found.rows[0].id,
                        workspaceId,
                        r.description ?? null,
                        perms,
                        r.isSystem ?? true,
                    ],
                );
            } else {
                const created = await pool.query<{ id: string }>(
                    'INSERT INTO roles ("workspaceId", name, description, permissions, "isSystem") VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING id',
                    [workspaceId, r.name, r.description ?? null, perms, r.isSystem ?? true],
                );
                roleIds.set(r.name, created.rows[0].id);
                counts.roles += 1;
            }
        }
        const userIds = new Map<string, string>();
        for (const u of pack.users ?? []) {
            const found = await pool.query<{ id: string }>(
                "SELECT id FROM users WHERE email = $1 LIMIT 1",
                [u.email],
            );
            let userId: string;
            if (found.rows[0]) {
                userId = found.rows[0].id;
                await pool.query("UPDATE users SET name = $2 WHERE id = $1", [userId, u.name]);
            } else {
                const created = await pool.query<{ id: string }>(
                    "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id",
                    [u.name, u.email],
                );
                userId = created.rows[0].id;
                counts.users += 1;
            }
            userIds.set(u.email, userId);
            const roleId = roleIds.get(u.role ?? "member") ?? roleIds.get("member") ?? null;
            const mem = await pool.query<{ id: string }>(
                'SELECT id FROM memberships WHERE "userId" = $1 AND "workspaceId" = $2 LIMIT 1',
                [userId, workspaceId],
            );
            if (mem.rows[0]) {
                await pool.query('UPDATE memberships SET "roleId" = $2 WHERE id = $1', [
                    mem.rows[0].id,
                    roleId,
                ]);
            } else {
                await pool.query(
                    'INSERT INTO memberships ("userId", "workspaceId", "roleId") VALUES ($1, $2, $3)',
                    [userId, workspaceId, roleId],
                );
                counts.memberships += 1;
            }
        }
        const firstEmail = (pack.users ?? [])[0]?.email;
        const firstUserId = firstEmail ? userIds.get(firstEmail) : undefined;
        if ((pack.sampleTasks ?? []).length > 0 && !firstUserId)
            throw new Error("Pack has sampleTasks but no users to assign them to");
        for (const t of pack.sampleTasks ?? []) {
            const found = await pool.query(
                'SELECT id FROM tasks WHERE "workspaceId" = $1 AND title = $2 LIMIT 1',
                [workspaceId, t.title],
            );
            if (!found.rows[0]) {
                const assigneeId =
                    (t.assigneeEmail ? userIds.get(t.assigneeEmail) : undefined) ?? firstUserId;
                await pool.query(
                    'INSERT INTO tasks ("workspaceId", title, description, status, priority, "dueDate", "createdById", "assigneeId") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [
                        workspaceId,
                        t.title,
                        t.description ?? null,
                        t.status ?? "todo",
                        t.priority ?? 0,
                        t.dueDate ? resolveDate(t.dueDate) : null,
                        firstUserId,
                        assigneeId,
                    ],
                );
                counts.tasks += 1;
            }
        }
        for (const e of pack.sampleEvents ?? []) {
            const found = await pool.query(
                'SELECT id FROM events WHERE "workspaceId" = $1 AND title = $2 LIMIT 1',
                [workspaceId, e.title],
            );
            if (!found.rows[0]) {
                await pool.query(
                    'INSERT INTO events ("workspaceId", title, description, "startDate", "endDate", location, "isPublic", status, "createdById") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                    [
                        workspaceId,
                        e.title,
                        e.description ?? null,
                        resolveDate(e.startDate),
                        e.endDate ? resolveDate(e.endDate) : null,
                        e.location ?? null,
                        e.isPublic ?? false,
                        e.status ?? "draft",
                        firstUserId,
                    ],
                );
                counts.events += 1;
            }
        }
        for (const t of pack.proposalTemplates ?? []) {
            const found = await pool.query(
                'SELECT id FROM proposal_templates WHERE "workspaceId" = $1 AND title = $2 LIMIT 1',
                [workspaceId, t.title],
            );
            if (!found.rows[0]) {
                await pool.query(
                    'INSERT INTO proposal_templates ("workspaceId", title, description, category, "createdById") VALUES ($1, $2, $3, $4, $5)',
                    [workspaceId, t.title, t.description, t.category ?? null, firstUserId],
                );
                counts.templates += 1;
            }
        }
        for (const tx of pack.sampleTransactions ?? []) {
            const cents = toCents(tx.amount);
            const found = await pool.query(
                'SELECT id FROM transactions WHERE "workspaceId" = $1 AND description = $2 AND "amountCents" = $3 LIMIT 1',
                [workspaceId, tx.description ?? null, cents],
            );
            if (!found.rows[0]) {
                await pool.query(
                    'INSERT INTO transactions ("workspaceId", "amountCents", type, category, description, date, "createdById") VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [
                        workspaceId,
                        cents,
                        tx.type,
                        tx.category ?? null,
                        tx.description ?? null,
                        tx.date ? resolveDate(tx.date) : new Date(),
                        firstUserId,
                    ],
                );
                counts.transactions += 1;
            }
        }
        for (const b of pack.budgetAllocations ?? []) {
            const found = await pool.query(
                'SELECT id FROM budget_allocations WHERE "workspaceId" = $1 AND category = $2 AND "fiscalYear" = $3 LIMIT 1',
                [workspaceId, b.category, b.fiscalYear],
            );
            if (!found.rows[0]) {
                await pool.query(
                    'INSERT INTO budget_allocations ("workspaceId", category, "amountCents", "fiscalYear", status, description) VALUES ($1, $2, $3, $4, $5, $6)',
                    [
                        workspaceId,
                        b.category,
                        toCents(b.amount),
                        b.fiscalYear,
                        b.status ?? "active",
                        b.description ?? null,
                    ],
                );
                counts.budgets += 1;
            }
        }
        console.log(
            `seeded portal "${slug}" from ${packArg}: workspace=${pack.workspace.slug} (+${counts.workspaces}) roles=+${counts.roles} users=+${counts.users} memberships=+${counts.memberships} tasks=+${counts.tasks} events=+${counts.events} templates=+${counts.templates} transactions=+${counts.transactions} budgets=+${counts.budgets}`,
        );
    } finally {
        await pool.end();
    }
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
