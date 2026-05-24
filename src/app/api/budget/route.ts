import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { success, error } from "@/lib/api-response";
import { writeAuditLog } from "@/lib/audit";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const currentYear = new Date().getFullYear();
    const url = new URL(request.url);
    const fiscalYear = Number(url.searchParams.get("fiscalYear")) || currentYear;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
    const skip = (page - 1) * limit;

    const where = { workspaceId: workspace.id, fiscalYear };

    const allocations = await db.budgetAllocation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });

    const data = allocations.map((a) => ({
      ...a,
      amount: Number(a.amount),
      spent: Number(a.spent),
    }));

    return success(data);
  } catch (e) {
    console.error("GET /api/budget", e);
    return error("Internal server error", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const body = await request.json();
    const { category, amount, fiscalYear, description } = body;

    if (!category?.trim() || amount == null) {
      return error("Category and amount are required", 400);
    }

    const allocation = await db.budgetAllocation.create({
      data: {
        workspaceId: workspace.id,
        category: category.trim(),
        amount,
        fiscalYear: fiscalYear ?? new Date().getFullYear(),
        description: description ?? null,
      },
    });

    await writeAuditLog(
      {
        workspaceId: workspace.id,
        userId: session.user.id,
        action: "create_budget_allocation",
        entityType: "budget_allocation",
        entityId: allocation.id,
        metadata: { category, amount: Number(amount), fiscalYear },
      },
      db,
    );

    return success(
      { ...allocation, amount: Number(allocation.amount), spent: Number(allocation.spent) },
      201,
    );
  } catch (e) {
    console.error("POST /api/budget", e);
    return error("Internal server error", 500);
  }
}
