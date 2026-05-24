import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";
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
    const role = (session.user as any).role;
    const { id } = await params;

    if (!hasPermission(role, "approve_proposal")) {
      return error("Forbidden: insufficient permissions", 403);
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const proposal = await db.proposal.findUnique({ where: { id } });
    if (!proposal || proposal.workspaceId !== workspace.id) {
      return error("Proposal not found", 404);
    }
    if (proposal.status !== "pending") {
      return error("Only pending proposals can be approved", 400);
    }

    const updated = await db.proposal.update({
      where: { id },
      data: { status: "approved" },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "approved",
        entityType: "proposal",
        entityId: id,
        metadata: { title: proposal.title },
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "approve",
        entityType: "proposal",
        entityId: id,
        metadata: { title: proposal.title },
      },
      db,
    );

    return success(updated);
  } catch (e) {
    console.error("POST /api/proposals/[id]/approve", e);
    return error("Internal server error", 500);
  }
}
