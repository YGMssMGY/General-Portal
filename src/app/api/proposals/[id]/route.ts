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
    const { id } = await params;

    const proposal = await db.proposal.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, image: true } },
      },
    });

    if (!proposal) return error("Proposal not found", 404);

    const portal = session.user.portal;
    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace || proposal.workspaceId !== workspace.id) {
      return error("Proposal not found", 404);
    }

    return success(proposal);
  } catch (e) {
    console.error("GET /api/proposals/[id]", e);
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
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const existing = await db.proposal.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Proposal not found", 404);
    }

    const body = await request.json();
    const { title, description } = body;

    const data: Record<string, string> = {};
    if (title && typeof title === "string") data.title = title.trim();
    if (description && typeof description === "string") data.description = description.trim();

    if (Object.keys(data).length === 0) {
      return error("No fields to update", 400);
    }

    const proposal = await db.proposal.update({
      where: { id },
      data,
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "update",
        entityType: "proposal",
        entityId: proposal.id,
        metadata: { changes: data },
      },
      db,
    );

    return success(proposal);
  } catch (e) {
    console.error("PUT /api/proposals/[id]", e);
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

    const db = getDbFromCookie(request);
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const existing = await db.proposal.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Proposal not found", 404);
    }

    await db.proposal.delete({ where: { id } });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "delete",
        entityType: "proposal",
        entityId: id,
        metadata: { title: existing.title },
      },
      db,
    );

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/proposals/[id]", e);
    return error("Internal server error", 500);
  }
}
