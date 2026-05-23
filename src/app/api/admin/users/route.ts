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
    const portal = (session.user as any).portal;
    const role = (session.user as any).role;

    if (!hasPermission(role, "manage_users")) {
      return error("Forbidden: insufficient permissions", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const users = await db.user.findMany({
      where: {
        memberships: {
          some: { workspaceId: workspace.id },
        },
      },
      include: {
        memberships: {
          where: { workspaceId: workspace.id },
          select: { role: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(users);
  } catch (e) {
    console.error("GET /api/admin/users", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = (session.user as any).portal;
    const role = (session.user as any).role;

    if (!hasPermission(role, "manage_users")) {
      return error("Forbidden: insufficient permissions", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { email, name, role: memberRole } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return error("Email is required", 400);
    }
    if (!memberRole || !["admin", "officer", "member"].includes(memberRole)) {
      return error("Valid role (admin, officer, member) is required", 400);
    }

    const user = await db.user.upsert({
      where: { email: email.trim().toLowerCase() },
      update: { name: name?.trim() ?? null },
      create: {
        email: email.trim().toLowerCase(),
        name: name?.trim() ?? null,
      },
    });

    await db.membership.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id,
        },
      },
      update: { role: memberRole },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        role: memberRole,
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create_user",
        entityType: "user",
        entityId: user.id,
        metadata: { email: user.email, role: memberRole },
      },
      db,
    );

    const result = await db.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          where: { workspaceId: workspace.id },
          select: { role: true, createdAt: true },
        },
      },
    });

    return success(result, 201);
  } catch (e) {
    console.error("POST /api/admin/users", e);
    return error("Internal server error", 500);
  }
}
