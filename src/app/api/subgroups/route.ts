import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const portal = session.user.portal;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const isOfficer = hasPermission(session.user.role, "manage_subgroups");

    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (!isOfficer) {
      where.members = { some: { userId: session.user.id } };
    }

    const subgroups = await db.subgroup.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { members: true } },
      },
    });

    return success(subgroups);
  } catch (e) {
    console.error("GET /api/subgroups", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const portal = session.user.portal;

    if (!hasPermission(session.user.role, "manage_subgroups")) {
      return error("Forbidden", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { name, description, color } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return error("Name is required", 400);
    }

    const subgroup = await db.subgroup.create({
      data: {
        workspaceId: workspace.id,
        name: name.trim(),
        description: description?.trim() ?? null,
        color: color ?? "#0f62fe",
        createdById: session.user.id,
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create",
        entityType: "subgroup",
        entityId: subgroup.id,
        metadata: { name: subgroup.name },
      },
      db,
    );

    return success(subgroup, 201);
  } catch (e) {
    console.error("POST /api/subgroups", e);
    return error("Internal server error", 500);
  }
}
