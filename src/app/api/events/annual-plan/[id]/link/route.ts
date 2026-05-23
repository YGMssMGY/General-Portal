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

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;
    const planId = (await params).id;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const plan = await db.annualEventPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.workspaceId !== workspace.id) {
      return error("Annual plan not found", 404);
    }

    const body = await request.json();
    const { eventId, action } = body;

    if (!eventId || typeof eventId !== "string") {
      return error("eventId is required", 400);
    }
    if (action !== "link" && action !== "unlink") {
      return error('action must be "link" or "unlink"', 400);
    }

    const event = await db.eventItem.findUnique({ where: { id: eventId } });
    if (!event || event.workspaceId !== workspace.id) {
      return error("Event not found", 404);
    }

    if (action === "link") {
      if (event.annualPlanId) {
        return error("Event is already linked to an annual plan", 400);
      }

      await db.eventItem.update({
        where: { id: eventId },
        data: { annualPlanId: planId },
      });
    } else {
      if (event.annualPlanId !== planId) {
        return error("Event is not linked to this annual plan", 400);
      }

      await db.eventItem.update({
        where: { id: eventId },
        data: { annualPlanId: null },
      });
    }

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: action === "link" ? "link" : "unlink",
        entityType: "event",
        entityId: eventId,
        metadata: { planId, planName: plan.name, eventTitle: event.title },
      },
      db,
    );

    return success({ linked: action === "link" });
  } catch (e) {
    console.error("POST /api/events/annual-plan/[id]/link", e);
    return error("Internal server error", 500);
  }
}
