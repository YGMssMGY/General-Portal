import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { and, eq, inArray } from "drizzle-orm";
import { config } from "@/config";
import { getDb, type PortalDb } from "@/db/client";
import { memberships, users, workspaces } from "@/db/schema";
import { ApiError, isUuid } from "@/lib/api";
import { resolvePortalSlug } from "@/lib/tenant";

const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

type Detail = (key: string, fallback: string) => string;

function scimError(status: number, detail: string, scimType?: string) {
    return NextResponse.json(
        {
            schemas: [ERROR_SCHEMA],
            detail,
            status: String(status),
            ...(scimType ? { scimType } : {}),
        },
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

function toScimUser(user: typeof users.$inferSelect) {
    const parts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
    const givenName = parts.shift() ?? "";
    const familyName = parts.join(" ");
    return {
        schemas: [USER_SCHEMA],
        id: user.id,
        userName: user.email,
        active: !user.disabled,
        displayName: user.name ?? user.email,
        ...(user.name ? { name: { givenName, familyName, formatted: user.name } } : {}),
        emails: [{ value: user.email, primary: true }],
        meta: { resourceType: "User" },
    };
}

interface UserPatch {
    disabled?: boolean;
    name?: string | null;
}

function parsePatch(body: unknown, td: Detail): UserPatch | NextResponse {
    const invalid = () => scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
    if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
    const operations = (body as Record<string, unknown>).Operations;
    if (!Array.isArray(operations) || operations.length === 0) return invalid();
    const patch: UserPatch = {};
    for (const raw of operations) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) return invalid();
        const op = raw as Record<string, unknown>;
        const kind = typeof op.op === "string" ? op.op.toLowerCase() : "";
        const path = typeof op.path === "string" ? op.path.toLowerCase() : "";
        if (kind !== "add" && kind !== "replace" && kind !== "remove") return invalid();
        if (path === "active") {
            if (kind === "remove" || typeof op.value !== "boolean") return invalid();
            patch.disabled = !op.value;
            continue;
        }
        if (path === "name") {
            if (kind === "remove") {
                patch.name = null;
                continue;
            }
            if (typeof op.value === "string") {
                patch.name = op.value.trim().slice(0, 200) || null;
                continue;
            }
            if (op.value && typeof op.value === "object" && !Array.isArray(op.value)) {
                const value = op.value as Record<string, unknown>;
                const given = typeof value.givenName === "string" ? value.givenName.trim() : "";
                const family = typeof value.familyName === "string" ? value.familyName.trim() : "";
                patch.name = [given, family].filter(Boolean).join(" ").slice(0, 200) || null;
                continue;
            }
        }
        return invalid();
    }
    return patch;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const denied = authorize(request, td);
    if (denied) return denied;
    const id = (await params).id;
    if (!isUuid(id)) return scimError(404, td("notFound", "User not found."));
    try {
        const ctx = await workspaceContext(request, td);
        if (ctx instanceof NextResponse) return ctx;
        const rows = await ctx.db
            .select({ user: users })
            .from(users)
            .innerJoin(memberships, eq(memberships.userId, users.id))
            .where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(users.id, id)))
            .limit(1);
        const user = rows[0]?.user;
        if (!user) return scimError(404, td("notFound", "User not found."));
        return NextResponse.json(toScimUser(user));
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
            return scimError(404, td("notFound", "User not found."));
        }
        console.error("SCIM GET /Users/[id]", e);
        return scimError(500, td("internal", "Internal server error."));
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const denied = authorize(request, td);
    if (denied) return denied;
    const id = (await params).id;
    if (!isUuid(id)) return scimError(404, td("notFound", "User not found."));
    try {
        const ctx = await workspaceContext(request, td);
        if (ctx instanceof NextResponse) return ctx;
        const rows = await ctx.db
            .select({ user: users })
            .from(users)
            .innerJoin(memberships, eq(memberships.userId, users.id))
            .where(and(eq(memberships.workspaceId, ctx.workspaceId), eq(users.id, id)))
            .limit(1);
        if (!rows[0]) return scimError(404, td("notFound", "User not found."));
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
        }
        const patch = parsePatch(body, td);
        if (patch instanceof NextResponse) return patch;
        if (Object.keys(patch).length === 0) {
            return scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
        }
        await ctx.db
            .update(users)
            .set({ ...patch, updatedAt: new Date() })
            .where(
                and(
                    eq(users.id, id),
                    inArray(
                        users.id,
                        ctx.db
                            .select({ userId: memberships.userId })
                            .from(memberships)
                            .where(eq(memberships.workspaceId, ctx.workspaceId)),
                    ),
                ),
            );
        const updated = await ctx.db.query.users.findFirst({ where: eq(users.id, id) });
        if (!updated) return scimError(404, td("notFound", "User not found."));
        return NextResponse.json(toScimUser(updated));
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
            return scimError(404, td("notFound", "User not found."));
        }
        console.error("SCIM PATCH /Users/[id]", e);
        return scimError(500, td("internal", "Internal server error."));
    }
}
