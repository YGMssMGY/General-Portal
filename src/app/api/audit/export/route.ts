import type { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { auditLogs } from "@/db/schema";
import { handleRouteError } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

function escapeCsv(value: string): string {
    if (/^[=+\-@]/.test(value.trim()) || /^[\t\r]/.test(value)) value = `'${value}`;
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "view_audit", module: "members" });
        const searchParams = new URL(request.url).searchParams;
        const entityType = searchParams.get("entityType")?.trim() || null;
        const action = searchParams.get("action")?.trim() || null;

        const conds = [eq(auditLogs.workspaceId, t.workspaceId)];
        if (entityType) conds.push(eq(auditLogs.entityType, entityType));
        if (action) conds.push(eq(auditLogs.action, action));

        const logs = await t.db.query.auditLogs.findMany({
            where: and(...conds),
            orderBy: [desc(auditLogs.createdAt), desc(auditLogs.id)],
            limit: 2000,
            with: { user: { columns: { name: true, email: true } } },
        });

        const header = "Timestamp,User,Email,Action,EntityType,EntityId,Metadata,IP\n";
        const rows = logs
            .map((l) => {
                const userName = l.user ? escapeCsv(l.user.name ?? "") : "";
                const userEmail = l.user ? escapeCsv(l.user.email ?? "") : "";
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

        return new Response(header + rows, {
            status: 200,
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="audit-log-${t.workspace.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (e) {
        return handleRouteError("GET /api/audit/export", e);
    }
}
