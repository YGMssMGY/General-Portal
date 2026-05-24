import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import type { PurchaseRequestStatus } from "@prisma/client";

const VALID_REVIEW_STATUSES: PurchaseRequestStatus[] = ["approved", "rejected"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const portal = session.user.portal;
    const role = session.user.role;
    const { id } = await params;

    if (role !== "admin") return error("Forbidden: admin only", 403);

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const purchaseRequest = await db.purchaseRequest.findUnique({ where: { id } });
    if (!purchaseRequest || purchaseRequest.workspaceId !== workspace.id) {
      return error("Purchase request not found", 404);
    }

    if (!["submitted", "under_review"].includes(purchaseRequest.status)) {
      return error("Purchase request must be in submitted or under_review status to review", 400);
    }

    const body = await request.json();
    const { status, reviewComment } = body;

    if (!status || !VALID_REVIEW_STATUSES.includes(status)) {
      return error("Valid status is required (approved or rejected)", 400);
    }

    const updated = await db.purchaseRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: session.user.id,
        reviewComment: reviewComment?.trim() ?? null,
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: status === "approved" ? "approved" : "rejected",
        entityType: "purchase_request",
        entityId: id,
        metadata: {
          title: purchaseRequest.title,
          itemName: purchaseRequest.itemName,
          reviewComment: reviewComment?.trim() ?? null,
        },
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: `purchase_request_${status}`,
        entityType: "purchase_request",
        entityId: id,
        metadata: {
          title: purchaseRequest.title,
          previousStatus: purchaseRequest.status,
          reviewComment: reviewComment?.trim() ?? null,
        },
      },
      db,
    );

    return success({
      ...updated,
      cost: Number(updated.cost),
    });
  } catch (e) {
    console.error("POST /api/purchase-requests/[id]/review", e);
    return error("Internal server error", 500);
  }
}
