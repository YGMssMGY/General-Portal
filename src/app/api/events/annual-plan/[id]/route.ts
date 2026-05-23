import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const plan = await db.annualEventPlan.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { startDate: "asc" },
          include: {
            createdBy: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    if (!plan || plan.workspaceId !== workspace.id) {
      return error("Annual plan not found", 404);
    }

    return success(plan);
  } catch (e) {
    console.error("GET /api/events/annual-plan/[id]", e);
    return error("Internal server error", 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const existing = await db.annualEventPlan.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Annual plan not found", 404);
    }

    const body = await request.json();
    const { name, academicYear, description, isActive } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (academicYear !== undefined) data.academicYear = academicYear;
    if (description !== undefined) data.description = description;
    if (isActive !== undefined) data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return error("No fields to update", 400);
    }

    const plan = await db.annualEventPlan.update({ where: { id }, data });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "update",
        entityType: "annual_event_plan",
        entityId: id,
        metadata: { changes: data },
      },
      db,
    );

    return success(plan);
  } catch (e) {
    console.error("PUT /api/events/annual-plan/[id]", e);
    return error("Internal server error", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const role = (session.user as any).role;
    if (role !== "admin") return error("Forbidden: admin only", 403);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const plan = await db.annualEventPlan.findUnique({ where: { id } });
    if (!plan || plan.workspaceId !== workspace.id) {
      return error("Annual plan not found", 404);
    }

    await db.annualEventPlan.delete({ where: { id } });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "delete",
        entityType: "annual_event_plan",
        entityId: id,
        metadata: { name: plan.name, academicYear: plan.academicYear },
      },
      db,
    );

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/events/annual-plan/[id]", e);
    return error("Internal server error", 500);
  }
}
