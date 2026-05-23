import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    if (!q) return success({ results: [], total: 0 });

    const [tasks, events, proposals, members, meetings] = await Promise.all([
      db.taskItem.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, description: true },
      }),
      db.eventItem.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, description: true },
      }),
      db.proposal.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, description: true },
      }),
      db.user.findMany({
        where: {
          memberships: { some: { workspaceId: workspace.id } },
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, email: true },
      }),
      db.meeting.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, description: true },
      }),
    ]);

    const results = [
      ...tasks.map((t) => ({ id: t.id, title: t.title, snippet: t.description || "", type: "tasks" as const, url: `/${portal}/tasks` })),
      ...events.map((e) => ({ id: e.id, title: e.title, snippet: e.description || "", type: "events" as const, url: `/${portal}/events` })),
      ...proposals.map((p) => ({ id: p.id, title: p.title, snippet: p.description || "", type: "proposals" as const, url: `/${portal}/proposals` })),
      ...members.map((m) => ({ id: m.id, title: m.name || m.email, snippet: m.email, type: "members" as const, url: `/${portal}/members` })),
      ...meetings.map((m) => ({ id: m.id, title: m.title, snippet: m.description || "", type: "meetings" as const, url: `/${portal}/meetings` })),
    ];

    return success({ results, total: results.length });
  } catch (e) {
    console.error("GET /api/search", e);
    return error("Internal server error", 500);
  }
}
