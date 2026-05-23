import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./uploads";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const db = getDbFromCookie(request);
    const { id } = await params;

    const attachment = await db.attachment.findUnique({ where: { id } });
    if (!attachment) return error("File not found", 404);

    try {
      await unlink(join(UPLOADS_DIR, attachment.storagePath));
    } catch {
      // file may already be deleted from disk
    }

    await db.attachment.delete({ where: { id } });
    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/files/[id]", e);
    return error("Internal server error", 500);
  }
}
