import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const { id } = await params;

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const membership = await db.membership.findFirst({
      where: { userId: id, workspaceId: workspace.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
    });

    if (!membership) return error("Member not found", 404);

    const data = {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      image: membership.user.image,
      role: membership.role,
      joinedAt: membership.user.createdAt,
      membershipSince: membership.createdAt,
    };

    return success(data);
  } catch (e) {
    console.error("GET /api/members/[id]", e);
    return error("Internal server error", 500);
  }
}
