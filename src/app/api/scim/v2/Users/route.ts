import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { memberships, roles, users } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth/passwords";
import {
    authorize,
    LIST_SCHEMA,
    scimAudit,
    scimError,
    toScimUser,
    type Detail,
    workspaceContext,
} from "../../shared";

const USERNAME_FILTER = /^userName\s+eq\s+"([^"]+)"$/i;

export async function GET(request: NextRequest) {
    const t = await getTranslations("scim");
    const td: Detail = (key, fallback) => (t.has(key) ? t(key) : fallback);
    const auth = authorize(request, td);
    if (auth instanceof NextResponse) return auth;
    try {
        const ctx = await workspaceContext(auth.slug, td);
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
    const auth = authorize(request, td);
    if (auth instanceof NextResponse) return auth;
    try {
        const ctx = await workspaceContext(auth.slug, td);
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
        const passwordHash = await hashPassword(randomBytes(48).toString("base64url"));
        const result = await db.transaction(async (tx) => {
            const existing = await tx
                .select({ id: users.id })
                .from(users)
                .innerJoin(memberships, eq(memberships.userId, users.id))
                .where(and(eq(users.email, email), eq(memberships.workspaceId, workspaceId)))
                .limit(1);
            if (existing[0]) return { status: "conflict" as const, user: null };
            const inserted = await tx
                .insert(users)
                .values({ email, name: fullName, passwordHash, disabled: !active })
                .returning();
            const created = inserted[0];
            if (!created) return { status: "error" as const, user: null };
            const memberRole = await tx.query.roles.findFirst({
                where: and(eq(roles.workspaceId, workspaceId), eq(roles.name, "member")),
            });
            await tx.insert(memberships).values({
                workspaceId,
                userId: created.id,
                roleId: memberRole?.id ?? null,
            });
            return { status: "created" as const, user: created };
        });
        if (result.status === "conflict") {
            return scimError(
                409,
                td("conflict", "A user with this userName already exists."),
                "uniqueness",
            );
        }
        if (result.status !== "created" || !result.user) {
            return scimError(500, td("internal", "Internal server error."));
        }
        const user = result.user;
        await scimAudit({
            db,
            workspaceId,
            request,
            action: "scim.create_user",
            entityType: "user",
            entityId: user.id,
            metadata: { email, roleName: "member", active },
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
