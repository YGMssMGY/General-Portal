import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

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

    const purchaseRequest = await db.purchaseRequest.findUnique({
      where: { id },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, image: true } },
        reviewedBy: { select: { id: true, name: true, image: true } },
      },
    });

    if (!purchaseRequest || purchaseRequest.workspaceId !== workspace.id) {
      return error("Purchase request not found", 404);
    }

    return success({
      ...purchaseRequest,
      cost: Number(purchaseRequest.cost),
    });
  } catch (e) {
    console.error("GET /api/purchase-requests/[id]", e);
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

    const purchaseRequest = await db.purchaseRequest.findUnique({ where: { id } });
    if (!purchaseRequest || purchaseRequest.workspaceId !== workspace.id) {
      return error("Purchase request not found", 404);
    }

    await db.purchaseRequest.delete({ where: { id } });

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/purchase-requests/[id]", e);
    return error("Internal server error", 500);
  }
}
