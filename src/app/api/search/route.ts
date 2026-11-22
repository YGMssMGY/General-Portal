import type { NextRequest } from "next/server";
import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { events, meetings, memberships, proposals, tasks, users } from "@/db/schema";
import { fail, handleRouteError, ok } from "@/lib/api";
import { sensitiveLimitCheck } from "@/lib/rate-limit-guard";
import { requireTenant } from "@/lib/tenant";

function escapeLike(s: string): string {
    return s.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {});
        if (await sensitiveLimitCheck(request, "search")) {
            return fail("Too many requests", 429);
        }
        const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
        if (!q) return ok({ results: [], total: 0 });

        const pattern = `%${escapeLike(q)}%`;

        const [taskRows, eventRows, proposalRows, memberRows, meetingRows] = await Promise.all([
            t.db.query.tasks.findMany({
                where: and(
                    eq(tasks.workspaceId, t.workspaceId),
                    isNull(tasks.deletedAt),
                    or(ilike(tasks.title, pattern), ilike(tasks.description, pattern)),
                ),
                columns: { id: true, title: true, description: true },
                limit: 5,
            }),
            t.db.query.events.findMany({
                where: and(
                    eq(events.workspaceId, t.workspaceId),
                    isNull(events.deletedAt),
                    or(ilike(events.title, pattern), ilike(events.description, pattern)),
                ),
                columns: { id: true, title: true, description: true },
                limit: 5,
            }),
            t.db.query.proposals.findMany({
                where: and(
                    eq(proposals.workspaceId, t.workspaceId),
                    isNull(proposals.deletedAt),
                    or(ilike(proposals.title, pattern), ilike(proposals.description, pattern)),
                ),
                columns: { id: true, title: true, description: true },
                limit: 5,
            }),
            t.db
                .select({ id: users.id, name: users.name, email: users.email })
                .from(memberships)
                .innerJoin(users, eq(memberships.userId, users.id))
                .where(
                    and(
                        eq(memberships.workspaceId, t.workspaceId),
                        or(ilike(users.name, pattern), ilike(users.email, pattern)),
                    ),
                )
                .limit(5),
            t.db.query.meetings.findMany({
                where: and(
                    eq(meetings.workspaceId, t.workspaceId),
                    isNull(meetings.deletedAt),
                    or(ilike(meetings.title, pattern), ilike(meetings.description, pattern)),
                ),
                columns: { id: true, title: true, description: true },
                limit: 5,
            }),
        ]);

        const results = [
            ...taskRows.map((r) => ({
                id: r.id,
                title: r.title,
                snippet: r.description ?? "",
                type: "tasks" as const,
                url: `/${t.portal}/tasks`,
            })),
            ...eventRows.map((r) => ({
                id: r.id,
                title: r.title,
                snippet: r.description ?? "",
                type: "events" as const,
                url: `/${t.portal}/events`,
            })),
            ...proposalRows.map((r) => ({
                id: r.id,
                title: r.title,
                snippet: r.description ?? "",
                type: "proposals" as const,
                url: `/${t.portal}/proposals`,
            })),
            ...memberRows.map((m) => ({
                id: m.id,
                title: m.name || m.email,
                snippet: m.email,
                type: "members" as const,
                url: `/${t.portal}/members`,
            })),
            ...meetingRows.map((r) => ({
                id: r.id,
                title: r.title,
                snippet: r.description ?? "",
                type: "meetings" as const,
                url: `/${t.portal}/meetings`,
            })),
        ];

        return ok({ results, total: results.length });
    } catch (e) {
        return handleRouteError("GET /api/search", e);
    }
}
