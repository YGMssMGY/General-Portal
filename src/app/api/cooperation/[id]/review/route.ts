import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

const VALID_REVIEW_STATUSES = ["approved", "rejected"];

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

    if (role !== "admin") return error("Forbidden: admin only", 403);

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const cooperationRequest = await db.cooperationRequest.findUnique({ where: { id } });
    if (!cooperationRequest || cooperationRequest.workspaceId !== workspace.id) {
      return error("Cooperation request not found", 404);
    }

    const body = await request.json();
    const { status, reviewComment } = body;

    if (!status || !VALID_REVIEW_STATUSES.includes(status)) {
      return error("Valid status is required (approved or rejected)", 400);
    }

    const updated = await db.cooperationRequest.update({
      where: { id },
      data: {
        status,
        reviewedById: session.user.id,
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: status === "approved" ? "approved" : "rejected",
        entityType: "cooperation_request",
        entityId: id,
        metadata: {
          clubName: cooperationRequest.clubName,
          eventTitle: cooperationRequest.eventTitle,
          reviewComment: reviewComment?.trim() ?? null,
        },
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: `cooperation_request_${status}`,
        entityType: "cooperation_request",
        entityId: id,
        metadata: {
          clubName: cooperationRequest.clubName,
          eventTitle: cooperationRequest.eventTitle,
          previousStatus: cooperationRequest.status,
          reviewComment: reviewComment?.trim() ?? null,
        },
      },
      db,
    );

    return success(updated);
  } catch (e) {
    console.error("POST /api/cooperation/[id]/review", e);
    return error("Internal server error", 500);
  }
}
