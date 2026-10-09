import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { cooperationRequests } from "@/db/schema";
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

function body<T>(schema: {
    safeParse: (
        v: unknown,
    ) =>
        | { success: true; data: T }
        | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
}) {
    return {
        safeParse: (v: unknown) => {
            const r = schema.safeParse(v);
            if (r.success) return { success: true as const, data: r.data };
            return {
                success: false as const,
                error: {
                    issues: r.error.issues.map((i) => ({
                        path: i.path.filter(
                            (p): p is string | number =>
                                typeof p === "string" || typeof p === "number",
                        ),
                        message: i.message,
                    })),
                },
            };
        },
    };
}

const createSchema = z
    .object({
        clubName: z.string().trim().min(1).max(200),
        contactName: z.string().trim().min(1).max(200),
        contactEmail: z.email().max(320).optional(),
        email: z.email().max(320).optional(),
        eventTitle: z.string().trim().min(1).max(200),
        description: z.string().trim().min(1).max(5000),
        proposedDate: z.string().trim().max(50).optional(),
        resourcesNeeded: z.string().trim().max(2000).nullish(),
    })
    .refine((v) => v.contactEmail || v.email, { message: "Contact email is required" });

const withAliases = <
    T extends { contactEmail: string; submittedBy: { id: string; name: string | null } | null },
>(
    r: T,
) => ({
    ...r,
    email: r.contactEmail,
    createdBy: r.submittedBy ? { id: r.submittedBy.id, name: r.submittedBy.name } : null,
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "partnerships" });
        const sp = request.nextUrl.searchParams;
        const { limit, cursor } = parsePagination(sp);
        const status = sp.get("status")?.trim() || null;

        const cVals = decodeCursorValues(cursor);
        const cDate =
            cVals && typeof cVals[0] === "string" && !Number.isNaN(new Date(cVals[0]).getTime())
                ? new Date(cVals[0])
                : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cDate && cId
                ? keysetWhere(
                      [{ column: cooperationRequests.createdAt, value: cDate }],
                      cooperationRequests.id,
                      cId,
                  )
                : undefined;

        const rows = await t.db.query.cooperationRequests.findMany({
            where: and(
                eq(cooperationRequests.workspaceId, t.workspaceId),
                isNull(cooperationRequests.deletedAt),
                status ? eq(cooperationRequests.status, status) : undefined,
                cursorCond,
            ),
            orderBy: [desc(cooperationRequests.createdAt), desc(cooperationRequests.id)],
            limit: limit + 1,
            with: {
                submittedBy: { columns: { id: true, name: true, email: true, image: true } },
                reviewedBy: { columns: { id: true, name: true, image: true } },
            },
        });

        const items = rows.slice(0, limit).map(withAliases);
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last
                ? encodeCursorValues([last.createdAt.toISOString(), last.id])
                : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/cooperation", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "partnerships" });
        const data = await parseBody(body(createSchema), request);
        const contactEmail = (data.contactEmail ?? data.email) as string;

        let proposedDate: Date | null = null;
        if (data.proposedDate?.trim()) {
            proposedDate = new Date(data.proposedDate.trim());
            if (Number.isNaN(proposedDate.getTime()))
                throw new ApiError("Invalid proposed date", 400);
        }

        const [row] = await t.db
            .insert(cooperationRequests)
            .values({
                workspaceId: t.workspaceId,
                clubName: data.clubName,
                contactName: data.contactName,
                contactEmail,
                eventTitle: data.eventTitle,
                description: data.description,
                proposedDate,
                resourcesNeeded: data.resourcesNeeded ?? null,
                status: "pending",
                submittedById: t.userId,
            })
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "cooperation_request",
            entityId: row.id,
            metadata: { clubName: row.clubName, eventTitle: row.eventTitle },
            ipAddress: clientIp(request),
        });

        return ok(withAliases({ ...row, submittedBy: null, reviewedBy: null }), 201);
    } catch (e) {
        return handleRouteError("POST /api/cooperation", e);
    }
}
