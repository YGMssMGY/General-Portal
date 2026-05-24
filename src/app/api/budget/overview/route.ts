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

    const agg = await db.budgetAllocation.aggregate({
      _sum: { amount: true, spent: true },
      where: { workspaceId: workspace.id },
    });

    const totalAllocated = Number(agg._sum.amount ?? 0);
    const totalSpent = Number(agg._sum.spent ?? 0);

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
