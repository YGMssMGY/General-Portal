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
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const template = await db.proposalTemplate.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, image: true } },
      },
    });

    if (!template || template.workspaceId !== workspace.id) {
      return error("Template not found", 404);
    }

    return success(template);
  } catch (e) {
    console.error("GET /api/proposals/templates/[id]", e);
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

    const role = session.user.role;
    if (role !== "admin") return error("Forbidden: admin only", 403);

    const db = getDbFromCookie(request);
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const existing = await db.proposalTemplate.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Template not found", 404);
    }

    const body = await request.json();
    const { title, description, category } = body;

    const data: Record<string, string | null> = {};
    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return error("Title must be a non-empty string", 400);
      }
      data.title = title.trim();
    }
    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        return error("Description must be a non-empty string", 400);
      }
      data.description = description.trim();
    }
    if (category !== undefined) {
      data.category = category?.trim() ?? null;
    }

    if (Object.keys(data).length === 0) {
      return error("No fields to update", 400);
    }

    const template = await db.proposalTemplate.update({
      where: { id },
      data,
    });

    return success(template);
  } catch (e) {
    console.error("PUT /api/proposals/templates/[id]", e);
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

    const role = session.user.role;
    if (role !== "admin") return error("Forbidden: admin only", 403);

    const db = getDbFromCookie(request);
    const portal = session.user.portal;
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const existing = await db.proposalTemplate.findUnique({ where: { id } });
    if (!existing || existing.workspaceId !== workspace.id) {
      return error("Template not found", 404);
    }

    await db.proposalTemplate.delete({ where: { id } });

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/proposals/templates/[id]", e);
    return error("Internal server error", 500);
  }
}
