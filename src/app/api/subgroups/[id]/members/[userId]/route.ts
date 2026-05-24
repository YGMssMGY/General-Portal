import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const portal = session.user.portal;

    const { id, userId } = await params;

    if (
      userId !== session.user.id &&
      !hasPermission(session.user.role, "manage_subgroups")
    ) {
      return error("Forbidden", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const subgroup = await db.subgroup.findFirst({
      where: { id, workspaceId: workspace.id },
    });
    if (!subgroup) return error("Subgroup not found", 404);

    const membership = await db.subgroupMembership.findUnique({
      where: { subgroupId_userId: { subgroupId: id, userId } },
    });
    if (!membership) return error("Membership not found", 404);

    await db.subgroupMembership.delete({
      where: { id: membership.id },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "remove_member",
        entityType: "subgroup",
        entityId: id,
        metadata: { removedUserId: userId, subgroupName: subgroup.name },
      },
      db,
    );

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/subgroups/[id]/members/[userId]", e);
    return error("Internal server error", 500);
  }
}
