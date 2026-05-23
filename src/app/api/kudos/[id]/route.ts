import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const role = (session.user as any).role;
    if (role !== "admin") return error("Only admins can delete kudos", 403);

    const db = getDbFromCookie(request);
    const { id } = await params;
    const kudo = await db.kudos.findUnique({ where: { id } });
    if (!kudo) return error("Kudos not found", 404);
    await db.kudos.delete({ where: { id } });
    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/kudos/[id]", e);
    return error("Internal server error", 500);
  }
}
