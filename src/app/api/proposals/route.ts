import type { NextRequest } from "next/server";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { proposals } from "@/db/schema";
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

const createProposalSchema = z.object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim().min(1, "Description is required"),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "proposals" });
        const { searchParams } = new URL(request.url);
        const { limit, cursor } = parsePagination(searchParams);
        const status = searchParams.get("status");
        const search = searchParams.get("search") ?? "";

        const conds = [eq(proposals.workspaceId, t.workspaceId), isNull(proposals.deletedAt)];
        if (status === "pending" || status === "approved" || status === "rejected") {
            conds.push(eq(proposals.status, status));
        }
        if (search) {
            const escaped = search.replace(/[\\%_]/g, (m) => `\\${m}`);
            const pattern = `%${escaped}%`;
            conds.push(or(ilike(proposals.title, pattern), ilike(proposals.description, pattern))!);
        }
        const cv = decodeCursorValues(cursor);
        if (cv && typeof cv[0] === "string" && typeof cv[1] === "string") {
            const cursorDate = new Date(cv[0]);
            if (!Number.isNaN(cursorDate.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: proposals.createdAt, value: cursorDate }],
                        proposals.id,
                        cv[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.proposals.findMany({
            where: and(...conds),
            orderBy: [desc(proposals.createdAt), desc(proposals.id)],
            limit: limit + 1,
            with: {
                createdBy: { columns: { id: true, name: true, email: true, image: true } },
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
        return handleRouteError("GET /api/proposals", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "create_proposal",
            module: "proposals",
        });
        const body = await parse(createProposalSchema, request);

        const inserted = await t.db
            .insert(proposals)
            .values({
                workspaceId: t.workspaceId,
                title: body.title,
                description: body.description,
                createdById: t.userId,
            })
            .returning();
        const proposal = inserted[0];
        if (!proposal) throw new ApiError("Failed to create proposal", 500);

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "create",
            entityType: "proposal",
            entityId: proposal.id,
            metadata: { title: proposal.title },
            ipAddress: clientIp(request),
        });

        return ok(proposal, 201);
    } catch (e) {
        return handleRouteError("POST /api/proposals", e);
    }
}
