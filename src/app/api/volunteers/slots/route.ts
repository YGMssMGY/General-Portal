import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = {
      workspaceId: workspace.id,
      startTime: { gte: new Date() },
    };

    const slots = await db.volunteerSlot.findMany({
      where,
      orderBy: { startTime: "asc" },
      skip,
      take: limit,
      include: {
        _count: { select: { signups: true } },
      },
    });

    const data = slots.map((s) => ({
      ...s,
      signupCount: s._count.signups,
      _count: undefined,
    }));

    return success(data);
  } catch (e) {
    console.error("GET /api/volunteers/slots", e);
    return error("Internal server error", 500);
  }
}
