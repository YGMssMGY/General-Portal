import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { memberships, roles, users } from "@/db/schema";
import { ApiError } from "@/lib/api";
import {
    authorize,
    GROUP_SCHEMA,
    LIST_SCHEMA,
    scimError,
    type Detail,
    workspaceContext,
} from "../../shared";

export async function GET(request: NextRequest) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const auth = authorize(request, td);
    if (auth instanceof NextResponse) return auth;
    try {
        const ctx = await workspaceContext(auth.slug, td);
        if (ctx instanceof NextResponse) return ctx;
        const [roleRows, memberRows] = await Promise.all([
            ctx.db.query.roles.findMany({
                where: eq(roles.workspaceId, ctx.workspaceId),
                orderBy: [roles.name],
            }),
            ctx.db
                .select({ roleId: memberships.roleId, userId: users.id, userName: users.email })
                .from(memberships)
                .innerJoin(users, eq(users.id, memberships.userId))
                .where(eq(memberships.workspaceId, ctx.workspaceId)),
        ]);
        const membersByRole = new Map<string, Array<{ value: string; display: string }>>();
        for (const member of memberRows) {
            if (!member.roleId) continue;
            const list = membersByRole.get(member.roleId) ?? [];
            list.push({ value: member.userId, display: member.userName });
            membersByRole.set(member.roleId, list);
        }
        const Resources = roleRows.map((role) => ({
            schemas: [GROUP_SCHEMA],
            id: role.id,
            displayName: role.name,
            members: membersByRole.get(role.id) ?? [],
            meta: { resourceType: "Group" },
        }));
        return NextResponse.json({
            schemas: [LIST_SCHEMA],
            totalResults: Resources.length,
            startIndex: 1,
            itemsPerPage: Resources.length,
            Resources,
        });
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
            return scimError(404, td("notFound", "Workspace not found."));
        }
        console.error("SCIM GET /Groups", e);
        return scimError(500, td("internal", "Internal server error."));
    }
}
