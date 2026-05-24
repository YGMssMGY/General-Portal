import { error } from "@/lib/api-response";
import { getDbForPortal } from "@/lib/db";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let file: {
      id: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      storagePath: string;
    } | null = null;

    for (const portal of ["developers", "stuco"]) {
      const db = getDbForPortal(portal);
      file = await db.attachment.findUnique({
        where: { id },
        select: { id: true, fileName: true, fileSize: true, mimeType: true, storagePath: true },
      });
      if (file) break;
    }

    if (!file) return error("File not found", 404);

    const buffer = await readFile(join(UPLOADS_DIR, file.storagePath));

    const encodedName = encodeURIComponent(file.fileName);
    return new Response(buffer, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
        "Content-Length": String(file.fileSize),
      },
    });
  } catch (e) {
    console.error("GET /api/files/download/[id]", e);
    return error("Internal server error", 500);
  }
}
