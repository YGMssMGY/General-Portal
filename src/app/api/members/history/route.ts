import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { historicalMembers } from "@/db/schema";
import {
    ApiError,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const createHistorySchema = z.object({
    name: z.string().trim().min(1).max(200),
    role: z.string().trim().min(1).max(100),
    academicYear: z.string().trim().min(1).max(20),
    councilType: z.string().trim().max(100).nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    notes: z.string().trim().max(2000).nullish(),
});
type CreateHistoryInput = z.infer<typeof createHistorySchema>;

function parseOptDate(value: string | null | undefined, field: string): Date | null {
    if (value === null || value === undefined || value === "") return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new ApiError(`Invalid ${field}`, 400);
    return d;
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const conds = [eq(historicalMembers.workspaceId, t.workspaceId)];
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
                        [{ column: historicalMembers.createdAt, value: at }],
                        historicalMembers.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.historicalMembers.findMany({
            where: and(...conds),
            orderBy: [desc(historicalMembers.createdAt), desc(historicalMembers.id)],
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
        return handleRouteError("GET /api/members/history", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "manage_users", module: "members" });
        const body = await parseBody<CreateHistoryInput>(createHistorySchema as never, request);

        const [row] = await t.db
            .insert(historicalMembers)
            .values({
                workspaceId: t.workspaceId,
                name: body.name,
                role: body.role,
                academicYear: body.academicYear,
                councilType: body.councilType?.trim() || "student_council",
                startDate: parseOptDate(body.startDate, "startDate"),
                endDate: parseOptDate(body.endDate, "endDate"),
                notes: body.notes?.trim() || null,
            })
            .returning();

        return ok(row, 201);
    } catch (e) {
        return handleRouteError("POST /api/members/history", e);
    }
}
