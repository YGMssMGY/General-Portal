import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import { hasPermission } from "@/lib/permissions";
import { NextRequest } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const membership = await db.membership.findFirst({
      where: { userId: id, workspaceId: workspace.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
    });

    if (!membership) return error("Member not found", 404);

    return success({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      image: membership.user.image,
      role: membership.role,
      joinedAt: membership.user.createdAt,
      membershipSince: membership.createdAt,
    });
  } catch (e) {
    console.error("GET /api/members/[id]", e);
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

    const callerRole = (session.user as any).role;
    if (!hasPermission(callerRole, "manage_users")) {
      return error("Only admins can change member roles", 403);
    }

    const db = getDbFromCookie(request);
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { role } = body;

    if (!["admin", "officer", "member"].includes(role)) {
      return error("Invalid role. Must be admin, officer, or member", 400);
    }

    const membership = await db.membership.findFirst({
      where: { userId: id, workspaceId: workspace.id },
    });
    if (!membership) return error("Member not found", 404);

    const updated = await db.membership.update({
      where: { id: membership.id },
      data: { role },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "update_role",
        entityType: "membership",
        entityId: membership.id,
        metadata: { targetUserId: id, oldRole: membership.role, newRole: role },
      },
      db,
    );

    return success({ id: membership.userId, role: updated.role });
  } catch (e) {
    console.error("PUT /api/members/[id]", e);
    return error("Internal server error", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const callerRole = (session.user as any).role;
    if (!hasPermission(callerRole, "manage_users")) {
      return error("Only admins can remove members", 403);
    }

    const db = getDbFromCookie(request);
    const { id } = await params;

    if (id === session.user.id) {
      return error("Cannot remove yourself", 400);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const membership = await db.membership.findFirst({
      where: { userId: id, workspaceId: workspace.id },
    });
    if (!membership) return error("Member not found", 404);

    await db.membership.delete({ where: { id: membership.id } });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "remove_member",
        entityType: "membership",
        entityId: membership.id,
        metadata: { targetUserId: id },
      },
      db,
    );

    return success({ removed: true });
  } catch (e) {
    console.error("DELETE /api/members/[id]", e);
    return error("Internal server error", 500);
  }
}
