import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { eq } from "drizzle-orm";
import { config } from "@/config";
import { getDb, type PortalDb } from "@/db/client";
import { memberships, roles, users, workspaces } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { resolvePortalSlug } from "@/lib/tenant";

const GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

type Detail = (key: string, fallback: string) => string;

function scimError(status: number, detail: string) {
    return NextResponse.json(
        { schemas: [ERROR_SCHEMA], detail, status: String(status) },
        { status },
    );
}

function tokenMatches(presented: string): boolean {
    const a = createHash("sha256").update(presented).digest();
    const b = createHash("sha256").update(config.scimToken).digest();
    return timingSafeEqual(a, b);
}

function authorize(request: NextRequest, td: Detail): NextResponse | null {
    if (!config.scimToken) {
        return scimError(501, td("notConfigured", "Service is not configured."));
    }
    const match = /^Bearer\s+(.+)$/.exec((request.headers.get("authorization") ?? "").trim());
    const presented = match?.[1]?.trim() ?? "";
    if (!presented || !tokenMatches(presented)) {
        return scimError(401, td("unauthorized", "Invalid or missing bearer token."));
    }
    return null;
}

async function workspaceContext(
    request: NextRequest,
    td: Detail,
): Promise<{ db: PortalDb; workspaceId: string } | NextResponse> {
    const slug = resolvePortalSlug(request);
    const db = getDb(slug);
    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.slug, slug) });
    if (!workspace) return scimError(404, td("notFound", "Workspace not found."));
    return { db, workspaceId: workspace.id };
}

export async function GET(request: NextRequest) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const denied = authorize(request, td);
    if (denied) return denied;
    try {
        const ctx = await workspaceContext(request, td);
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
