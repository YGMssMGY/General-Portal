import { auth } from "@/lib/auth";
import { getDbFromCookie } from "@/lib/db";
import { error } from "@/lib/api-response";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return error("Unauthorized", 401);
    if (!hasPermission(session.user.role, "view_audit")) {
      return error("Forbidden", 403);
    }

    const db = getDbFromCookie(request);

    const workspace = await db.workspace.findUnique({
      where: { slug: session.user.portal },
    });
    if (!workspace) return error("Workspace not found", 404);

    const logs = await db.auditLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    const header = "Timestamp,User,Email,Action,EntityType,EntityId,Metadata,IP\n";
    const rows = logs
      .map((l) => {
        const userName = l.user ? escapeCsv(l.user.name ?? "") : "";
        const userEmail = l.user ? escapeCsv(l.user.email) : "";
        const metadata = l.metadata ? escapeCsv(JSON.stringify(l.metadata)) : "";
        return [
          l.createdAt.toISOString(),
          userName,
          userEmail,
          escapeCsv(l.action),
          escapeCsv(l.entityType),
          escapeCsv(l.entityId ?? ""),
          metadata,
          escapeCsv(l.ipAddress ?? ""),
        ].join(",");
      })
      .join("\n");

    const csv = header + rows;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${workspace.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error("GET /api/audit/export", e);
    return error("Internal server error", 500);
  }
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
