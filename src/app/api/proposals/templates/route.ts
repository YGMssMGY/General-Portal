import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";

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
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const templates = await db.proposalTemplate.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
      },
    });

    return success(templates);
  } catch (e) {
    console.error("GET /api/proposals/templates", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const role = session.user.role;
    if (role !== "admin" && !hasPermission(role, "approve_proposal")) {
      return error("Forbidden: insufficient permissions", 403);
    }

    const db = getDbFromCookie(request);
    const portal = session.user.portal;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { title, description, category } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return error("Title is required", 400);
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return error("Description is required", 400);
    }

    const template = await db.proposalTemplate.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        description: description.trim(),
        category: category?.trim() ?? null,
        createdById: session.user.id,
      },
    });

    return success(template, 201);
  } catch (e) {
    console.error("POST /api/proposals/templates", e);
    return error("Internal server error", 500);
  }
}
