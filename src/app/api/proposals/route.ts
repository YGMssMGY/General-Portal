import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";
import type { ProposalStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const status = searchParams.get("status") as ProposalStatus | null;
    const search = searchParams.get("search") ?? "";

    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [proposals, total] = await Promise.all([
      db.proposal.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          createdBy: { select: { id: true, name: true, email: true, image: true } },
        },
      }),
      db.proposal.count({ where }),
    ]);

    return success({ proposals, total });
  } catch (e) {
    console.error("GET /api/proposals", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, description } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return error("Title is required", 400);
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return error("Description is required", 400);
    }

    const proposal = await db.proposal.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        description: description.trim(),
        createdById: session.user.id,
      },
    });

    await db.activityFeed.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "created",
        entityType: "proposal",
        entityId: proposal.id,
        metadata: { title: proposal.title },
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create",
        entityType: "proposal",
        entityId: proposal.id,
        metadata: { title: proposal.title },
      },
      db,
    );

    return success(proposal, 201);
  } catch (e) {
    console.error("POST /api/proposals", e);
    return error("Internal server error", 500);
  }
}
