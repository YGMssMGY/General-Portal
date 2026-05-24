import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = ["image/", "application/pdf", "text/", "application/msword", "application/vnd.openxmlformats-officedocument", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml"];

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
    const entityType = searchParams.get("entityType") || "file";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = { workspaceId: workspace.id, entityType };

    const files = await db.attachment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    });

    return success(files);
  } catch (e) {
    console.error("GET /api/files", e);
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return error("No file provided", 400);

    if (file.size > MAX_FILE_SIZE) return error("File too large. Max 10MB", 400);

    const allowed = ALLOWED_MIMES.some((prefix) => file.type.startsWith(prefix));
    if (!allowed && file.type !== "") return error("File type not allowed", 400);

    const ext = file.name.split(".").pop() || "";
    const storedName = `${randomUUID()}.${ext}`;
    const dir = join(UPLOADS_DIR, portal);
    await mkdir(dir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(join(dir, storedName), buffer);

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") || "file";

    const attachment = await db.attachment.create({
      data: {
        workspaceId: workspace.id,
        entityType,
        entityId: entityType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
        storagePath: join(portal, storedName),
        uploadedById: session.user.id,
      },
    });

    return success(attachment, 201);
  } catch (e) {
    console.error("POST /api/files", e);
    return error("Internal server error", 500);
  }
}
