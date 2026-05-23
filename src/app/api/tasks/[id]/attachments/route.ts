import { NextRequest } from "next/server";
import { join } from "node:path";
import { writeFile } from "node:fs/promises";
import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

const UPLOADS_DIR = process.env.UPLOADS_DIR || join(process.cwd(), "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_PATTERNS = [/^image\//, /^application\/pdf$/, /^text\//];

function isAllowedMime(mime: string): boolean {
  return ALLOWED_MIME_PATTERNS.some((pattern) => pattern.test(mime));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const { id } = await params;

    const portal = (session.user as any).portal;
    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const task = await db.taskItem.findUnique({ where: { id } });
    if (!task || task.workspaceId !== workspace.id) {
      return error("Task not found", 404);
    }

    const attachments = await db.attachment.findMany({
      where: { entityType: "task", entityId: id },
      orderBy: { createdAt: "desc" },
    });

    return success(attachments);
  } catch (e) {
    console.error("GET /api/tasks/[id]/attachments", e);
    return error("Internal server error", 500);
  }
}

export async function POST(
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

    const task = await db.taskItem.findUnique({ where: { id } });
    if (!task || task.workspaceId !== workspace.id) {
      return error("Task not found", 404);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return error("No file provided", 400);
    if (file.size > MAX_FILE_SIZE) return error("File exceeds 10 MB limit", 400);
    if (!isAllowedMime(file.type)) {
      return error("File type not allowed. Accepted: images, PDF, text files", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueName = `${crypto.randomUUID()}-${file.name}`;
    const storagePath = join(UPLOADS_DIR, uniqueName);

    await writeFile(storagePath, buffer);

    const attachment = await db.attachment.create({
      data: {
        workspaceId: workspace.id,
        entityType: "task",
        entityId: id,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storagePath,
        uploadedById: session.user.id,
      },
    });

    return success(attachment, 201);
  } catch (e) {
    console.error("POST /api/tasks/[id]/attachments", e);
    return error("Internal server error", 500);
  }
}
