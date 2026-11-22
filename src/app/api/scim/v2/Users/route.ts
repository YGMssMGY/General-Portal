import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { config } from "@/config";
import { getDb, type PortalDb } from "@/db/client";
import { memberships, roles, users, workspaces } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth/passwords";
import { resolvePortalSlug } from "@/lib/tenant";

const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";
const USERNAME_FILTER = /^userName\s+eq\s+"([^"]+)"$/i;

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

export async function GET(request: NextRequest) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const denied = authorize(request, td);
    if (denied) return denied;
    try {
        const ctx = await workspaceContext(request, td);
        if (ctx instanceof NextResponse) return ctx;
        const { db, workspaceId } = ctx;
        const params = new URL(request.url).searchParams;
        const rawFilter = params.get("filter");
        let userName: string | null = null;
        if (rawFilter) {
            const match = USERNAME_FILTER.exec(rawFilter.trim());
            if (!match?.[1] || !z.email().safeParse(match[1]).success) {
                return scimError(400, td("invalidFilter", "Invalid filter."), "invalidFilter");
            }
            userName = match[1].trim().toLowerCase();
        }
        const rawStart = Number.parseInt(
            params.get("startIndex") ?? params.get("startCount") ?? "1",
            10,
        );
        const rawCount = Number.parseInt(params.get("count") ?? "100", 10);
        const startIndex = Number.isFinite(rawStart) && rawStart > 0 ? rawStart : 1;
        const limit = Math.min(100, Math.max(1, Number.isFinite(rawCount) ? rawCount : 100));
        const where = userName
            ? and(eq(memberships.workspaceId, workspaceId), eq(users.email, userName))
            : eq(memberships.workspaceId, workspaceId);
        const [rows, totals] = await Promise.all([
            db
                .select({ user: users })
                .from(users)
                .innerJoin(memberships, eq(memberships.userId, users.id))
                .where(where)
                .orderBy(users.id)
                .limit(limit)
                .offset(startIndex - 1),
            db
                .select({ n: count() })
                .from(users)
                .innerJoin(memberships, eq(memberships.userId, users.id))
                .where(where),
        ]);
        return NextResponse.json({
            schemas: [LIST_SCHEMA],
            totalResults: Number(totals[0]?.n ?? 0),
            startIndex,
            itemsPerPage: rows.length,
            Resources: rows.map((row) => toScimUser(row.user)),
        });
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
            return scimError(404, td("notFound", "Workspace not found."));
        }
        console.error("SCIM GET /Users", e);
        return scimError(500, td("internal", "Internal server error."));
    }
}

export async function POST(request: NextRequest) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const denied = authorize(request, td);
    if (denied) return denied;
    try {
        const ctx = await workspaceContext(request, td);
        if (ctx instanceof NextResponse) return ctx;
        const { db, workspaceId } = ctx;
        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
        }
        const input = body as Record<string, unknown>;
        const rawUserName = input.userName;
        if (
            typeof rawUserName !== "string" ||
            rawUserName.length > 320 ||
            !z.email().safeParse(rawUserName).success
        ) {
            return scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
        }
        const email = rawUserName.trim().toLowerCase();
        const active = input.active === undefined ? true : input.active;
        if (typeof active !== "boolean") {
            return scimError(400, td("invalidRequest", "Invalid request."), "invalidValue");
        }
        const rawName =
            input.name && typeof input.name === "object" && !Array.isArray(input.name)
                ? (input.name as Record<string, unknown>)
                : {};
        const givenName =
            typeof rawName.givenName === "string" ? rawName.givenName.trim().slice(0, 100) : "";
        const familyName =
            typeof rawName.familyName === "string" ? rawName.familyName.trim().slice(0, 100) : "";
        const fullName = [givenName, familyName].filter(Boolean).join(" ") || null;

        const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
        if (existing) {
            return scimError(
                409,
                td("conflict", "A user with this userName already exists."),
                "uniqueness",
            );
        }
        const passwordHash = await hashPassword(randomBytes(48).toString("base64url"));
        const inserted = await db
            .insert(users)
            .values({ email, name: fullName, passwordHash, disabled: !active })
            .returning();
        const user = inserted[0];
        if (!user) return scimError(500, td("internal", "Internal server error."));
        const memberRole = await db.query.roles.findFirst({
            where: and(eq(roles.workspaceId, workspaceId), eq(roles.name, "member")),
        });
        await db.insert(memberships).values({
            workspaceId,
            userId: user.id,
            roleId: memberRole?.id ?? null,
        });
        return NextResponse.json(toScimUser(user), {
            status: 201,
            headers: { Location: `${new URL(request.url).origin}/scim/v2/Users/${user.id}` },
        });
    } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
            return scimError(404, td("notFound", "Workspace not found."));
        }
        console.error("SCIM POST /Users", e);
        return scimError(500, td("internal", "Internal server error."));
    }
}
