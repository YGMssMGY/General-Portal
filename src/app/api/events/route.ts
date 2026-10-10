import type { NextRequest } from "next/server";
import { and, desc, eq, gte, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { events } from "@/db/schema";
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
import { validateCustomFields } from "@/lib/custom-fields";

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

const createEventSchema = z.object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim().nullish(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullish(),
    location: z.string().nullish(),
    isPublic: z.boolean().optional(),
    status: z.enum(["draft", "published", "cancelled"]).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "events" });
        const { searchParams } = new URL(request.url);
        const { limit, cursor } = parsePagination(searchParams);
        const status = searchParams.get("status");
        const from = searchParams.get("from");
        const to = searchParams.get("to");

        const conds = [eq(events.workspaceId, t.workspaceId), isNull(events.deletedAt)];
        if (status === "draft" || status === "published" || status === "cancelled") {
            conds.push(eq(events.status, status));
        }
        if (from) {
            const fromDate = new Date(from);
            if (!Number.isNaN(fromDate.getTime())) conds.push(gte(events.startDate, fromDate));
        }
        if (to) {
            const toDate = new Date(to);
            if (!Number.isNaN(toDate.getTime())) conds.push(lte(events.startDate, toDate));
        }
        const cv = decodeCursorValues(cursor);
        if (cv && typeof cv[0] === "string" && typeof cv[1] === "string") {
            const cursorDate = new Date(cv[0]);
            if (!Number.isNaN(cursorDate.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: events.startDate, value: cursorDate }],
                        events.id,
                        cv[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.events.findMany({
            where: and(...conds),
            orderBy: [desc(events.startDate), desc(events.id)],
            limit: limit + 1,
            with: {
                createdBy: { columns: { id: true, name: true, email: true, image: true } },
                approvedBy: { columns: { id: true, name: true, email: true, image: true } },
                annualPlan: { columns: { id: true, name: true, academicYear: true } },
            },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            rows.pop();
            const last = rows[rows.length - 1];
            if (last) nextCursor = encodeCursorValues([last.startDate.toISOString(), last.id]);
        }
        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/events", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "create_event", module: "events" });
        const body = await parse(createEventSchema, request);
        const fieldErrors = await validateCustomFields(
            t.db,
            t.workspaceId,
            "event",
            body.metadata as Record<string, unknown> | undefined,
        );
        if (fieldErrors.length > 0) throw new ApiError(fieldErrors.join("; "), 400);

        const inserted = await t.db
            .insert(events)
            .values({
                workspaceId: t.workspaceId,
                title: body.title,
                description: body.description ?? null,
                startDate: body.startDate,
                endDate: body.endDate ?? null,
                location: body.location ?? null,
                isPublic: body.isPublic ?? false,
                status: body.status ?? "draft",
                metadata: (body.metadata ?? {}) as Record<string, unknown>,
                createdById: t.userId,
            })
            .returning();
        const event = inserted[0];
        if (!event) throw new ApiError("Failed to create event", 500);

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "create",
            entityType: "event",
            entityId: event.id,
            metadata: { title: event.title },
            ipAddress: clientIp(request),
        });

        return ok(event, 201);
    } catch (e) {
        return handleRouteError("POST /api/events", e);
    }
}
