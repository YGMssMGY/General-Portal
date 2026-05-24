import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { getRolePermissions } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const portal = session.user.portal;
    if (!portal) return error("No portal selected", 400);

    const db = getDbFromCookie(request);

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) return error("User not found", 404);

    const membership = await db.membership.findFirst({
      where: { userId: session.user.id },
      select: { role: true },
    });

    const role = membership?.role ?? "member";
    const permissions = getRolePermissions(role);

    return success({
      ...user,
      portal,
      role,
      permissions,
    });
  } catch (e) {
    console.error("GET /api/me", e);
    return error("Internal server error", 500);
  }
}
