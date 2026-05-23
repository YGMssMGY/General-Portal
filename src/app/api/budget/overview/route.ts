import { auth } from "@/lib/auth";
import { getDbForPortal } from "@/lib/db";
import { success, error } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);

    const portal = (session.user as any).portal;
    const db = getDbForPortal(portal);

    const workspace = await db.workspace.findUnique({
      where: { slug: portal },
      select: { id: true },
    });
    if (!workspace) return error("Workspace not found", 404);

    const allocations = await db.budgetAllocation.findMany({
      where: { workspaceId: workspace.id },
    });

    const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
    const totalSpent = allocations.reduce((sum, a) => sum + Number(a.spent), 0);

    return success({
      totalAllocated,
      totalSpent,
      totalRemaining: totalAllocated - totalSpent,
    });
  } catch (e) {
    console.error("GET /api/budget/overview", e);
    return error("Internal server error", 500);
  }
}
