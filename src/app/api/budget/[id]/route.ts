import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);
    const { id } = await params;

    const allocation = await db.budgetAllocation.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          include: {
            decidedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!allocation) return error("Budget allocation not found", 404);

    const data = {
      ...allocation,
      amount: Number(allocation.amount),
      spent: Number(allocation.spent),
      transactions: allocation.transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      })),
    };

    return success(data);
  } catch (e) {
    console.error("GET /api/budget/[id]", e);
    return error("Internal server error", 500);
  }
}

export async function PUT(
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

    const body = await request.json();
    const { category, amount, fiscalYear, description, status } = body;

    const updated = await db.budgetAllocation.update({
      where: { id },
      data: {
        ...(category !== undefined && { category: category.trim() }),
        ...(amount !== undefined && { amount }),
        ...(fiscalYear !== undefined && { fiscalYear }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
    });

    return success({
      ...updated,
      amount: Number(updated.amount),
      spent: Number(updated.spent),
    });
  } catch (e) {
    console.error("PUT /api/budget/[id]", e);
    return error("Internal server error", 500);
  }
}

export async function DELETE(
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

    await db.budgetAllocation.delete({ where: { id } });

    await writeAuditLog(
      {
        workspaceId: allocation.workspaceId,
        userId: session.user.id,
        action: "delete_budget_allocation",
        entityType: "budget_allocation",
        entityId: id,
        metadata: { category: allocation.category },
      },
      db,
    );

    return success({ deleted: true });
  } catch (e) {
    console.error("DELETE /api/budget/[id]", e);
    return error("Internal server error", 500);
  }
}
