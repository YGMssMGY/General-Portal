import type { NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { memberships, roles, tasks, transactions, users } from "@/db/schema";
import { ApiError, clientIp, handleRouteError, ok } from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";
import { sniffFileKind } from "@/lib/uploads";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 500;

const entityTypeSchema = z.enum(["task", "member", "transaction"]);
type EntityType = z.infer<typeof entityTypeSchema>;

const HEADER_RULES: Record<
    EntityType,
    { allowed: readonly string[]; required: readonly string[] }
> = {
    task: {
        allowed: ["title", "description", "status", "priority", "dueDate"],
        required: ["title"],
    },
    member: { allowed: ["email", "name", "role"], required: ["email"] },
    transaction: {
        allowed: ["amount", "type", "category", "description", "date"],
        required: ["amount", "type"],
    },
};

const taskRowSchema = z.object({
    title: z.string().trim().min(1).max(500),
    description: z.string().trim().max(5000).optional(),
    status: z.preprocess(
        (v) => (v === "" ? undefined : v),
        z.enum(["todo", "in_progress", "done"]).optional(),
    ),
    priority: z.preprocess(
        (v) => (v === "" ? undefined : Number(v)),
        z.number().int().min(0).max(1000).optional(),
    ),
    dueDate: z
        .string()
        .trim()
        .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Invalid date")
        .optional(),
});

const memberRowSchema = z.object({
    email: z.email(),
    name: z.string().trim().max(200).optional(),
    role: z.string().trim().max(100).optional(),
});

const transactionRowSchema = z.object({
    amount: z
        .string()
        .trim()
        .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
    type: z.enum(["income", "expense"]),
    category: z.string().trim().max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    date: z
        .string()
        .trim()
        .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), "Invalid date")
        .optional(),
});

function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    quoted = false;
                }
            } else {
                field += ch;
            }
        } else if (ch === '"' && field === "") {
            quoted = true;
        } else if (ch === ",") {
            row.push(field);
            field = "";
        } else if (ch === "\n" || ch === "\r") {
            if (ch === "\r" && text[i + 1] === "\n") i++;
            row.push(field);
            field = "";
            rows.push(row);
            row = [];
        } else {
            field += ch;
        }
    }
    if (field !== "" || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}

function firstReason(error: { issues: Array<{ message: string }> }): string {
    return error.issues[0]?.message ?? "Invalid row";
}

function toCents(value: string): number {
    const [whole, fraction = ""] = value.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_reports",
            module: "members",
        });
        const canManageUsers = t.permissions.includes("manage_users");
        const form = await request.formData();
        const parsedEntity = entityTypeSchema.safeParse(form.get("entityType"));
        if (!parsedEntity.success) throw new ApiError("Invalid entityType", 400);
        const entityType = parsedEntity.data;

        const file = form.get("file");
        if (!(file instanceof File)) throw new ApiError("Missing file", 400);
        if (file.size === 0) throw new ApiError("Empty file", 400);
        if (file.size > MAX_BYTES) throw new ApiError("File too large", 400);
        const sniffed = sniffFileKind(new Uint8Array(await file.slice(0, 512).arrayBuffer()));
        if (sniffed !== "text/plain") throw new ApiError("Unsupported file type", 400);

        let text: string;
        try {
            text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
        } catch {
            throw new ApiError("File must be UTF-8 text", 400);
        }

        const rows = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
        const headers = (rows[0] ?? []).map((h) => h.trim());
        const rule = HEADER_RULES[entityType];
        if (
            headers.length === 0 ||
            new Set(headers).size !== headers.length ||
            headers.some((h) => !rule.allowed.includes(h)) ||
            rule.required.some((h) => !headers.includes(h))
        ) {
            throw new ApiError("Invalid CSV headers", 400);
        }
        const dataRows = rows.slice(1);
        if (dataRows.length > MAX_ROWS) throw new ApiError("Too many rows (max 500)", 400);

        const roleIds =
            entityType === "member"
                ? new Map(
                      (
                          await t.db.query.roles.findMany({
                              where: eq(roles.workspaceId, t.workspaceId),
                          })
                      ).map((r) => [r.name, r.id] as const),
                  )
                : new Map<string, string>();

        const failed: Array<{ row: number; reason: string }> = [];
        const taskValues: Array<typeof tasks.$inferInsert> = [];
        const transactionValues: Array<typeof transactions.$inferInsert> = [];
        const memberValues: Array<{ email: string; name: string | null; roleId: string }> = [];

        for (let i = 0; i < dataRows.length; i++) {
            const cells = dataRows[i];
            const raw: Record<string, string> = {};
            headers.forEach((h, idx) => {
                raw[h] = (cells[idx] ?? "").trim();
            });
            const row = i + 2;

            if (entityType === "task") {
                const parsed = taskRowSchema.safeParse(raw);
                if (!parsed.success) {
                    failed.push({ row, reason: firstReason(parsed.error) });
                    continue;
                }
                const v = parsed.data;
                taskValues.push({
                    workspaceId: t.workspaceId,
                    createdById: t.userId,
                    title: v.title,
                    description: v.description || null,
                    status: v.status ?? "todo",
                    priority: v.priority ?? 0,
                    dueDate: v.dueDate ? new Date(v.dueDate) : null,
                });
            } else if (entityType === "member") {
                const parsed = memberRowSchema.safeParse(raw);
                if (!parsed.success) {
                    failed.push({ row, reason: firstReason(parsed.error) });
                    continue;
                }
                const roleName = parsed.data.role || "member";
                if (roleName !== "member" && !canManageUsers) {
                    throw new ApiError("Forbidden", 403);
                }
                const roleId = roleIds.get(roleName);
                if (!roleId) {
                    failed.push({ row, reason: "Unknown role" });
                    continue;
                }
                memberValues.push({
                    email: parsed.data.email.toLowerCase(),
                    name: parsed.data.name || null,
                    roleId,
                });
            } else {
                const parsed = transactionRowSchema.safeParse(raw);
                if (!parsed.success) {
                    failed.push({ row, reason: firstReason(parsed.error) });
                    continue;
                }
                const v = parsed.data;
                transactionValues.push({
                    workspaceId: t.workspaceId,
                    createdById: t.userId,
                    amountCents: toCents(v.amount),
                    type: v.type,
                    category: v.category || null,
                    description: v.description || null,
                    date: v.date ? new Date(v.date) : new Date(),
                });
            }
        }

        let inserted = 0;
        await t.db.transaction(async (tx) => {
            if (taskValues.length > 0) {
                const rows = await tx.insert(tasks).values(taskValues).returning({ id: tasks.id });
                inserted += rows.length;
            }
            if (transactionValues.length > 0) {
                const rows = await tx
                    .insert(transactions)
                    .values(transactionValues)
                    .returning({ id: transactions.id });
                inserted += rows.length;
            }
            if (memberValues.length > 0) {
                const unique = [...new Map(memberValues.map((m) => [m.email, m])).values()];
                const upserted = await tx
                    .insert(users)
                    .values(unique.map((m) => ({ email: m.email, name: m.name })))
                    .onConflictDoUpdate({
                        target: users.email,
                        set: { name: sql`coalesce(${users.name}, excluded.name)` },
                    })
                    .returning({ id: users.id, email: users.email });
                const idByEmail = new Map(upserted.map((u) => [u.email, u.id]));
                const membershipValues = unique.flatMap((m) => {
                    const userId = idByEmail.get(m.email);
                    return userId ? [{ workspaceId: t.workspaceId, userId, roleId: m.roleId }] : [];
                });
                if (membershipValues.length > 0) {
                    const rows = await tx
                        .insert(memberships)
                        .values(membershipValues)
                        .onConflictDoNothing()
                        .returning({ id: memberships.id });
                    inserted += rows.length;
                }
            }
        });
        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "import",
            entityType,
            metadata: { inserted, failed: failed.length, headers },
            ipAddress: clientIp(request),
        });

        return ok({ inserted, failed, headers });
    } catch (e) {
        return handleRouteError("POST /api/data-import", e);
    }
}
