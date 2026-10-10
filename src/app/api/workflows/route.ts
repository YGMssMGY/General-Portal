import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { workflows } from "@/db/schema";
import {
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const stageSchema = z.object({
    name: z.string().trim().min(1),
    approverRoleId: z.string().uuid().optional(),
    approverId: z.string().uuid().optional(),
    slaHours: z.number().positive().optional(),
    escalationRoleId: z.string().uuid().optional(),
});

const createWorkflowSchema = z.object({
    entityType: z.string().trim().min(1),
    name: z.string().trim().min(1),
    stages: z.array(stageSchema).min(1),
});
type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const searchParams = new URL(request.url).searchParams;
        const { limit, cursor } = parsePagination(searchParams);
        const entityType = searchParams.get("entityType")?.trim() || null;

        const conds = [eq(workflows.workspaceId, t.workspaceId)];
        if (entityType) conds.push(eq(workflows.entityType, entityType));
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: workflows.createdAt, value: at }],
                        workflows.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.workflows.findMany({
            where: and(...conds),
            orderBy: [desc(workflows.createdAt), desc(workflows.id)],
            limit: limit + 1,
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/workflows", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_workflows",
            module: "members",
        });
        const body = await parseBody<CreateWorkflowInput>(createWorkflowSchema as never, request);

        const id = randomUUID();
        const [[created]] = await Promise.all([
            t.db
                .insert(workflows)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    entityType: body.entityType,
                    name: body.name,
                    stages: body.stages,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "create",
                entityType: "workflow",
                entityId: id,
                metadata: { name: body.name, entityType: body.entityType },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(created, 201);
    } catch (e) {
        return handleRouteError("POST /api/workflows", e);
    }
}
