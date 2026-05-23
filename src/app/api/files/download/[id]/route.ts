import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { error } from "@/lib/api-response";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const { id } = await params;

    const file = await db.attachment.findUnique({ where: { id } });
    if (!file) return error("File not found", 404);

    const buffer = await readFile(join(UPLOADS_DIR, file.storagePath));

    return new Response(buffer, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Content-Length": String(file.fileSize),
      },
    });
  } catch (e) {
    console.error("GET /api/files/download/[id]", e);
    return error("Internal server error", 500);
  }
}
