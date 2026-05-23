import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const { id } = await params;

    const allocation = await db.budgetAllocation.findUnique({ where: { id } });
    if (!allocation) return error("Budget allocation not found", 404);

    const updated = await db.budgetAllocation.update({
      where: { id },
      data: { status: "active" },
    });

    await writeAuditLog(
      {
        workspaceId: allocation.workspaceId,
        userId: session.user.id,
        action: "approve_budget_allocation",
        entityType: "budget_allocation",
        entityId: id,
        metadata: { category: allocation.category },
      },
      db,
    );

    return success({
      ...updated,
      amount: Number(updated.amount),
      spent: Number(updated.spent),
    });
  } catch (e) {
    console.error("POST /api/budget/[id]/approve", e);
    return error("Internal server error", 500);
  }
}
