import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const subgroup = await db.subgroup.findFirst({
      where: { id, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!subgroup) return error("Subgroup not found", 404);

    const isOfficer = hasPermission(session.user.role, "manage_subgroups");
    const isMember = await db.subgroupMembership.findUnique({
      where: { subgroupId_userId: { subgroupId: id, userId: session.user.id } },
    });

    if (!isOfficer && !isMember) {
      return error("Forbidden", 403);
    }

    const members = await db.subgroupMembership.findMany({
      where: { subgroupId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    return success(members);
  } catch (e) {
    console.error("GET /api/subgroups/[id]/members", e);
    return error("Internal server error", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;

    const subgroup = await db.subgroup.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!subgroup) return error("Subgroup not found", 404);

    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return error("userIds array is required", 400);
    }

    const data = userIds.map((userId: string) => ({
      subgroupId: id,
      userId,
    }));

    await db.subgroupMembership.createMany({
      data,
      skipDuplicates: true,
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "add_members",
        entityType: "subgroup",
        entityId: id,
        metadata: { userIds, name: subgroup.name },
      },
      db,
    );

    return success({ added: userIds.length });
  } catch (e) {
    console.error("POST /api/subgroups/[id]/members", e);
    return error("Internal server error", 500);
  }
}
