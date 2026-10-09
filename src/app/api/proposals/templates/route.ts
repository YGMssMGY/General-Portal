import type { NextRequest } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { proposalTemplates } from "@/db/schema";
import {
    ApiError,
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";

type BodySchema<T> = {
    safeParse: (v: unknown) =>
        | { success: true; data: T }
        | {
              success: false;
              error: { issues: Array<{ path: (string | number)[]; message: string }> };
          };
};

async function parse<T>(schema: z.ZodType<T>, request: NextRequest): Promise<T> {
    return parseBody(schema as unknown as BodySchema<T>, request);
}

const createTemplateSchema = z.object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim().min(1, "Description is required"),
    category: z.string().trim().nullish(),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "proposals" });
        const { searchParams } = new URL(request.url);
        const { limit, cursor } = parsePagination(searchParams);

        const conds = [
            eq(proposalTemplates.workspaceId, t.workspaceId),
            isNull(proposalTemplates.deletedAt),
        ];
        const cv = decodeCursorValues(cursor);
        if (cv && typeof cv[0] === "string" && typeof cv[1] === "string") {
            const cursorDate = new Date(cv[0]);
            if (!Number.isNaN(cursorDate.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: proposalTemplates.createdAt, value: cursorDate }],
                        proposalTemplates.id,
                        cv[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.proposalTemplates.findMany({
            where: and(...conds),
            orderBy: [desc(proposalTemplates.createdAt), desc(proposalTemplates.id)],
            limit: limit + 1,
            with: {
                createdBy: { columns: { id: true, name: true, image: true } },
            },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            rows.pop();
            const last = rows[rows.length - 1];
            if (last) nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }
        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/proposals/templates", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "create_proposal",
            module: "proposals",
        });
        const body = await parse(createTemplateSchema, request);

        const inserted = await t.db
            .insert(proposalTemplates)
            .values({
                workspaceId: t.workspaceId,
                title: body.title,
                description: body.description,
                category: body.category ?? null,
                createdById: t.userId,
            })
            .returning();
        const template = inserted[0];
        if (!template) throw new ApiError("Failed to create template", 500);

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "create",
            entityType: "proposal_template",
            entityId: template.id,
            metadata: { title: template.title },
            ipAddress: clientIp(request),
        });

        return ok(template, 201);
    } catch (e) {
        return handleRouteError("POST /api/proposals/templates", e);
    }
}
