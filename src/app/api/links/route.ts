import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

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
    const category = searchParams.get("category");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { workspaceId: workspace.id };
    if (category && typeof category === "string" && category.trim()) {
      where.category = category.trim();
    }

    const links = await db.linkItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
    });

    return success(links);
  } catch (e) {
    console.error("GET /api/links", e);
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
    const { title, url, description, category } = body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return error("Title is required", 400);
    }
    if (!url || typeof url !== "string" || !url.trim()) {
      return error("URL is required", 400);
    }

    const link = await db.linkItem.create({
      data: {
        workspaceId: workspace.id,
        title: title.trim(),
        url: url.trim(),
        description: description?.trim() ?? null,
        category: category?.trim() ?? null,
        uploadedById: session.user.id,
      },
    });

    return success(link, 201);
  } catch (e) {
    console.error("POST /api/links", e);
    return error("Internal server error", 500);
  }
}
