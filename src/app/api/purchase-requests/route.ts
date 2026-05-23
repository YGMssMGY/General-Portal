import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import type { PurchaseRequestStatus } from "@prisma/client";

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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as PurchaseRequestStatus | null;

    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (
      status &&
      ["draft", "submitted", "under_review", "approved", "rejected", "fulfilled"].includes(status)
    ) {
      where.status = status;
    }

    const purchaseRequests = await db.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        submittedBy: { select: { id: true, name: true, email: true, image: true } },
        reviewedBy: { select: { id: true, name: true, image: true } },
      },
    });

    return success(purchaseRequests);
  } catch (e) {
    console.error("GET /api/purchase-requests", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, itemName, cost, justification, quantity } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return error("Title is required", 400);
    }
    if (!itemName || typeof itemName !== "string" || !itemName.trim()) {
      return error("Item name is required", 400);
    }
    if (cost == null || isNaN(Number(cost)) || Number(cost) <= 0) {
      return error("Valid cost is required", 400);
    }
    if (!justification || typeof justification !== "string" || !justification.trim()) {
      return error("Justification is required", 400);
    }

    const purchaseRequest = await db.purchaseRequest.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        itemName: itemName.trim(),
        cost: Number(cost),
        justification: justification.trim(),
        quantity: quantity != null && Number.isInteger(Number(quantity)) ? Number(quantity) : 1,
        status: "submitted",
        submittedById: session.user.id,
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "submitted",
        entityType: "purchase_request",
        entityId: purchaseRequest.id,
        metadata: { title: purchaseRequest.title, itemName: purchaseRequest.itemName, cost: Number(purchaseRequest.cost) },
      },
    });

    return success(purchaseRequest, 201);
  } catch (e) {
    console.error("POST /api/purchase-requests", e);
    return error("Internal server error", 500);
  }
}
