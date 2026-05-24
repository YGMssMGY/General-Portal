import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const role = session.user.role;
    if (role !== "admin") return error("Forbidden: admin only", 403);

    const db = getDbFromCookie(request);
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const event = await db.eventItem.findUnique({ where: { id } });
    if (!event || event.workspaceId !== workspace.id) {
      return error("Event not found", 404);
    }
    if (event.approvalStatus !== "pending") {
      return error("Only pending events can be rejected", 400);
    }

    const body = await request.json().catch(() => ({}));
    const reviewComment: string | undefined = body.reviewComment;

    const updated = await db.eventItem.update({
      where: { id },
      data: {
        approvalStatus: "rejected",
        reviewComment: reviewComment ?? null,
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "rejected",
        entityType: "event",
        entityId: id,
        metadata: { title: event.title, reviewComment: reviewComment ?? null },
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "reject",
        entityType: "event",
        entityId: id,
        metadata: { title: event.title, reviewComment: reviewComment ?? null },
      },
      db,
    );

    return success(updated);
  } catch (e) {
    console.error("POST /api/events/[id]/reject", e);
    return error("Internal server error", 500);
  }
}
