import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { historicalMembers } from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody, requireUuid } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const updateHistorySchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    role: z.string().trim().min(1).max(100).optional(),
    academicYear: z.string().trim().min(1).max(20).optional(),
    councilType: z.string().trim().max(100).nullish(),
    startDate: z.string().nullish(),
    endDate: z.string().nullish(),
    notes: z.string().trim().max(2000).nullish(),
});
type UpdateHistoryInput = z.infer<typeof updateHistorySchema>;

function parseOptDate(value: string | null | undefined, field: string): Date | null {
    if (value === null || value === undefined || value === "") return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw new ApiError(`Invalid ${field}`, 400);
    return d;
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const t = await requireTenant(request, { permission: "manage_users", module: "members" });
        const { id } = await params;
        requireUuid(id);
        const body = await parseBody<UpdateHistoryInput>(updateHistorySchema as never, request);

        const existing = await t.db.query.historicalMembers.findFirst({
            where: and(
                eq(historicalMembers.id, id),
                eq(historicalMembers.workspaceId, t.workspaceId),
            ),
        });
        if (!existing) throw new ApiError("History record not found", 404);

        const set: Partial<typeof historicalMembers.$inferInsert> = {};
        if (body.name !== undefined) set.name = body.name;
        if (body.role !== undefined) set.role = body.role;
        if (body.academicYear !== undefined) set.academicYear = body.academicYear;
        if (body.councilType !== undefined && body.councilType !== null)
            set.councilType = body.councilType.trim() || "student_council";
        if (body.startDate !== undefined) set.startDate = parseOptDate(body.startDate, "startDate");
        if (body.endDate !== undefined) set.endDate = parseOptDate(body.endDate, "endDate");
        if (body.notes !== undefined) set.notes = body.notes?.trim() || null;
        if (Object.keys(set).length === 0) throw new ApiError("No fields to update", 400);

        const [updated] = await t.db
            .update(historicalMembers)
            .set(set)
            .where(eq(historicalMembers.id, id))
            .returning();

        return ok(updated);
    } catch (e) {
        return handleRouteError("PUT /api/members/history/[id]", e);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const t = await requireTenant(request, { permission: "manage_users", module: "members" });
        const { id } = await params;
        requireUuid(id);

        const existing = await t.db.query.historicalMembers.findFirst({
            where: and(
                eq(historicalMembers.id, id),
                eq(historicalMembers.workspaceId, t.workspaceId),
            ),
        });
        if (!existing) throw new ApiError("History record not found", 404);

        await t.db.delete(historicalMembers).where(eq(historicalMembers.id, id));

        return ok({ deleted: true });
    } catch (e) {
        return handleRouteError("DELETE /api/members/history/[id]", e);
    }
}
