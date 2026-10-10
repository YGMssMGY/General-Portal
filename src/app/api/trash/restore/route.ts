import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    attachments,
    cooperationRequests,
    events,
    linkItems,
    meetings,
    messageThreads,
    proposals,
    purchaseRequests,
    showcaseItems,
    subgroups,
    tasks,
} from "@/db/schema";
import { ApiError, handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const restoreSchema = z.object({
    entityType: z.enum([
        "tasks",
        "events",
        "proposals",
        "messageThreads",
        "meetings",
        "subgroups",
        "linkItems",
        "attachments",
        "showcaseItems",
        "cooperationRequests",
        "purchaseRequests",
    ]),
    id: z.string().uuid(),
});
type RestoreInput = z.infer<typeof restoreSchema>;

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const body = await parseBody<RestoreInput>(restoreSchema as never, request);
        if (body.entityType === "tasks") {
            if (!t.permissions.includes("manage_all_tasks")) throw new ApiError("Forbidden", 403);
        } else if (t.roleName === "member") {
            throw new ApiError("Forbidden", 403);
        }
        const tables = {
            tasks,
            events,
            proposals,
            messageThreads,
            meetings,
            subgroups,
            linkItems,
            attachments,
            showcaseItems,
            cooperationRequests,
            purchaseRequests,
        } as const;
        const table = tables[body.entityType];
        const restored = await t.db
            .update(table)
            .set({ deletedAt: null })
            .where(and(eq(table.id, body.id), eq(table.workspaceId, t.workspaceId)))
            .returning({ id: table.id });
        if (restored.length === 0) throw new ApiError("Item not found", 404);
        return ok({ restored: true });
    } catch (e) {
        return handleRouteError("POST /api/trash/restore", e);
    }
}
