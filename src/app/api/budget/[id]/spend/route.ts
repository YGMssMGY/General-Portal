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

    const body = await request.json();
    const { amount, description } = body;

    if (amount == null || Number(amount) <= 0) {
      return error("A positive amount is required", 400);
    }

    const remaining = Number(allocation.amount) - Number(allocation.spent);
    if (Number(amount) > remaining) {
      return error(
        `Insufficient remaining budget. Available: ${remaining.toFixed(2)}`,
        400,
      );
    }

    const [budgetTx] = await db.$transaction([
      db.budgetTransaction.create({
        data: {
          allocationId: id,
          amount,
          type: "expense",
          description: description ?? null,
          decidedById: session.user.id,
        },
      }),
      db.budgetAllocation.update({
        where: { id },
        data: { spent: { increment: amount } },
      }),
    ]);

    await writeAuditLog(
      {
        workspaceId: allocation.workspaceId,
        userId: session.user.id,
        action: "record_spend",
        entityType: "budget_transaction",
        entityId: budgetTx.id,
        metadata: {
          allocationId: id,
          amount: Number(amount),
          category: allocation.category,
        },
      },
      db,
    );

    return success({ ...budgetTx, amount: Number(budgetTx.amount) }, 201);
  } catch (e) {
    console.error("POST /api/budget/[id]/spend", e);
    return error("Internal server error", 500);
  }
}
