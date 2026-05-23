import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

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

    const plans = await db.annualEventPlan.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { events: true } },
      },
    });

    return success(plans);
  } catch (e) {
    console.error("GET /api/events/annual-plan", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const role = (session.user as any).role;
    if (role !== "admin") return error("Forbidden: admin only", 403);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { name, academicYear, description } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return error("Name is required", 400);
    }
    if (!academicYear || typeof academicYear !== "string" || !academicYear.trim()) {
      return error("Academic year is required", 400);
    }

    const plan = await db.annualEventPlan.create({
      data: {
        workspaceId: workspace.id,
        name: name.trim(),
        academicYear: academicYear.trim(),
        description: description?.trim() ?? null,
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create",
        entityType: "annual_event_plan",
        entityId: plan.id,
        metadata: { name: plan.name, academicYear: plan.academicYear },
      },
      db,
    );

    return success(plan, 201);
  } catch (e) {
    console.error("POST /api/events/annual-plan", e);
    return error("Internal server error", 500);
  }
}
