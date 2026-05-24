import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { postEventToTeams } from "@/lib/teams";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const event = await db.eventItem.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        startDate: true,
        location: true,
        workspaceId: true,
        teamsMessageId: true,
      },
    });
    if (!event || event.workspaceId !== workspace.id) {
      return error("Event not found", 404);
    }

    if (event.teamsMessageId) {
      return error("Event has already been posted to Teams", 400);
    }

    const origin = request.headers.get("origin") ?? "https://generalportal.com";
    const eventUrl = `${origin}/events/${id}`;
    const dateStr = event.startDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const posted = await postEventToTeams({
      title: event.title,
      description: event.description ?? "",
      date: dateStr,
      location: event.location ?? undefined,
      url: eventUrl,
    });

    if (!posted) {
      return error("Failed to post event to Teams", 500);
    }

    const updated = await db.eventItem.update({
      where: { id },
      data: { teamsMessageId: "sent" },
      select: { id: true, title: true, teamsMessageId: true },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "post_to_teams",
        entityType: "event",
        entityId: id,
        metadata: { title: event.title },
      },
      db,
    );

    return success(updated);
  } catch (e) {
    console.error("POST /api/events/teams-post/[id]", e);
    return error("Internal server error", 500);
  }
}
