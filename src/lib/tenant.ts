import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { getDb, isKnownPortal, normalizeSlug, type PortalDb } from "@/db/client";
import {
    apiTokens,
    memberships,
    roles,
    sessions,
    workspaces,
    type Membership,
    type User,
    type Workspace,
} from "@/db/schema";
import { config } from "@/config";
import { ApiError } from "@/lib/api";
import { resolvePermissions, type Permission } from "@/lib/permissions";

export interface SessionInfo {
    token: string;
    sessionId: string;
    user: User;
    workspace: Workspace;
    membership: Membership;
    roleName: string;
    permissions: Permission[];
    provider: string;
}

export interface TenantContext extends SessionInfo {
    db: PortalDb;
    workspaceId: string;
    portal: string;
    userId: string;
    authMethod: "session" | "token";
    tokenScopes: string[];
}

function getCookie(request: NextRequest, name: string): string | null {
    return request.cookies.get(name)?.value ?? null;
}

function sha256Hex(v: string): string {
    return createHash("sha256").update(v).digest("hex");
}

export function resolvePortalSlug(request: NextRequest): string {
    const hinted = getCookie(request, config.portalCookie) ?? "developers";
    const slug = normalizeSlug(hinted) ?? "developers";
    if (!isKnownPortal(slug)) throw new ApiError("Unknown workspace", 404);
    return slug;
}

export async function getSession(request: NextRequest): Promise<SessionInfo | null> {
    const slug = resolvePortalSlug(request);
    const token = getCookie(request, config.sessionCookie);
    if (!token) return null;
    const db = getDb(slug);
    const now = new Date();

    const rows = await db.query.sessions.findMany({
        where: and(
            eq(sessions.tokenHash, sha256Hex(token)),
            gt(sessions.expiresAt, now),
            isNull(sessions.revokedAt),
        ),
        with: { user: true },
        limit: 1,
    });
    const row = rows[0];
    if (!row || !row.user || row.user.disabled) return null;

    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.slug, slug) });
    if (!workspace) return null;

    const member = await db.query.memberships.findFirst({
        where: and(eq(memberships.workspaceId, workspace.id), eq(memberships.userId, row.user.id)),
        with: { role: true },
    });
    if (!member) return null;

    let roleName = "member";
    let permissions: Permission[] = [];
    if (member.role) {
        roleName = member.role.name;
        permissions = member.role.permissions as Permission[];
    } else {
        permissions = await resolvePermissions(db, workspace.id, member.roleId, "member");
        if (member.roleId) {
            const r = await db.query.roles.findFirst({ where: eq(roles.id, member.roleId) });
            if (r) roleName = r.name;
        }
    }

    await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, row.id));

    return {
        token,
        sessionId: row.id,
        user: row.user,
        workspace,
        membership: member,
        roleName,
        permissions,
        provider: row.provider,
    };
}

export async function requireTenant(
    request: NextRequest,
    opts?: {
        permission?: Permission;
        anyOf?: Permission[];
        module?: string;
        allowToken?: boolean;
        scope?: string | string[];
    },
): Promise<TenantContext> {
    const slug = resolvePortalSlug(request);
    const session = await getSession(request);
    if (session) {
        if (opts?.module && session.workspace.settings[opts.module] === false) {
            throw new ApiError("Module disabled", 403);
        }
        if (opts?.permission && !session.permissions.includes(opts.permission)) {
            throw new ApiError("Forbidden", 403);
        }
        if (opts?.anyOf && !opts.anyOf.some((p) => session.permissions.includes(p))) {
            throw new ApiError("Forbidden", 403);
        }
        return {
            ...session,
            db: getDb(slug),
            workspaceId: session.workspace.id,
            portal: slug,
            userId: session.user.id,
            authMethod: "session",
            tokenScopes: [],
        };
    }
    if (opts?.allowToken === true) {
        const tokenCtx = await authenticateToken(request);
        if (!tokenCtx) throw new ApiError("Unauthorized", 401);
        if (opts?.module && tokenCtx.workspace.settings[opts.module] === false) {
            throw new ApiError("Module disabled", 403);
        }
        const required =
            opts.scope === undefined ? [] : Array.isArray(opts.scope) ? opts.scope : [opts.scope];
        if (required.some((s) => !tokenCtx.tokenScopes.includes(s))) {
            throw new ApiError("Forbidden", 403);
        }
        if (opts?.permission && !tokenCtx.permissions.includes(opts.permission)) {
            throw new ApiError("Forbidden", 403);
        }
        if (opts?.anyOf && !opts.anyOf.some((p) => tokenCtx.permissions.includes(p))) {
            throw new ApiError("Forbidden", 403);
        }
        return tokenCtx;
    }
    throw new ApiError("Unauthorized", 401);
}

export function newSessionToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString("base64url");
    return { token, tokenHash: sha256Hex(token) };
}

export function sessionExpiry(): Date {
    return new Date(Date.now() + config.sessionTtlHours * 3_600_000);
}

export function sessionCookieHeader(token: string, secure: boolean): string {
    const parts = [
        `${config.sessionCookie}=${token}`,
        "Path=/",
        "HttpOnly",
        "SameSite=Lax",
        `Max-Age=${config.sessionTtlHours * 3600}`,
    ];
    if (secure) parts.push("Secure");
    return parts.join("; ");
}

export function clearSessionCookieHeader(): string {
    return `${config.sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export { sha256Hex };

export async function authenticateToken(request: NextRequest): Promise<TenantContext | null> {
    const header = request.headers.get("authorization");
    if (!header) return null;
    const match = /^Bearer (.+)$/.exec(header.trim());
    const presented = match?.[1]?.trim();
    if (!presented) return null;
    const slug = resolvePortalSlug(request);
    const db = getDb(slug);
    const rows = await db.query.apiTokens.findMany({
        where: eq(apiTokens.tokenHash, sha256Hex(presented)),
        with: { user: true, workspace: true },
        limit: 1,
    });
    const row = rows[0];
    if (!row || !row.user || row.user.disabled || !row.workspace) return null;
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;
    const member = await db.query.memberships.findFirst({
        where: and(
            eq(memberships.workspaceId, row.workspace.id),
            eq(memberships.userId, row.user.id),
        ),
        with: { role: true },
    });
    if (!member) return null;
    let roleName = "member";
    let permissions: Permission[] = [];
    if (member.role) {
        roleName = member.role.name;
        permissions = member.role.permissions as Permission[];
    } else {
        permissions = await resolvePermissions(db, row.workspace.id, member.roleId, "member");
        if (member.roleId) {
            const r = await db.query.roles.findFirst({ where: eq(roles.id, member.roleId) });
            if (r) roleName = r.name;
        }
    }
    void (async () => {
        try {
            await db
                .update(apiTokens)
                .set({ lastUsedAt: new Date() })
                .where(eq(apiTokens.id, row.id));
        } catch {
            return;
        }
    })();
    return {
        token: presented,
        sessionId: row.id,
        user: row.user,
        workspace: row.workspace,
        membership: member,
        roleName,
        permissions,
        provider: "api_token",
        db,
        workspaceId: row.workspace.id,
        portal: slug,
        userId: row.user.id,
        authMethod: "token",
        tokenScopes: row.scopes ?? [],
    };
}
