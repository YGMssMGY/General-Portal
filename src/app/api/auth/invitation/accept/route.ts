import type { NextRequest } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { invitations, memberships, roles, users, workspaces } from "@/db/schema";
import { ApiError, clientIp, fail, handleRouteError, parseBody } from "@/lib/api";
import { hashPassword } from "@/lib/auth/passwords";
import { emailAllowed, getPortalAuthConfig } from "@/lib/auth/providers";
import { AccessDenied, createSessionForUser, sessionJsonResponse } from "@/lib/auth/session";
import { getSession, resolvePortalSlug, sha256Hex } from "@/lib/tenant";

const GENERIC = "This invitation is invalid or has expired";

const acceptSchema = z.object({
    token: z.string().min(20),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(12).max(256).optional(),
});

const ROLE_NAMES = ["admin", "officer", "member"];

export async function POST(request: NextRequest) {
    try {
        const body = await parseBody(acceptSchema, request);
        const portal = resolvePortalSlug(request);
        const db = getDb(portal);
        const workspace = await db.query.workspaces.findFirst({
            where: eq(workspaces.slug, portal),
        });
        if (!workspace) throw new ApiError(GENERIC, 400);

        const invitation = await db.query.invitations.findFirst({
            where: eq(invitations.tokenHash, sha256Hex(body.token)),
        });
        if (
            !invitation ||
            invitation.workspaceId !== workspace.id ||
            invitation.acceptedAt ||
            invitation.revokedAt ||
            invitation.expiresAt.getTime() <= Date.now()
        ) {
            throw new ApiError(GENERIC, 400);
        }
        const email = invitation.email.trim().toLowerCase();
        const session = await getSession(request);
        if (!session || (session.user.email ?? "").trim().toLowerCase() !== email) {
            return fail(GENERIC, 403);
        }
        if (!emailAllowed(email, getPortalAuthConfig(portal).allowedDomains)) {
            throw new ApiError(GENERIC, 400);
        }
        const roleName = ROLE_NAMES.includes(invitation.roleName) ? invitation.roleName : "member";
        const role = await db.query.roles.findFirst({
            where: and(eq(roles.workspaceId, workspace.id), eq(roles.name, roleName)),
        });
        if (!role) throw new ApiError(GENERIC, 400);
        const passwordHash = body.password ? await hashPassword(body.password) : null;

        let userId = "";
        await db.transaction(async (tx) => {
            let user = await tx.query.users.findFirst({ where: eq(users.email, email) });
            if (!user) {
                const created = await tx
                    .insert(users)
                    .values({ email, name: body.name, passwordHash, emailVerified: new Date() })
                    .onConflictDoNothing()
                    .returning();
                user =
                    created[0] ??
                    (await tx.query.users.findFirst({ where: eq(users.email, email) }));
            }
            if (!user) throw new ApiError(GENERIC, 400);
            userId = user.id;
            await tx
                .insert(memberships)
                .values({ userId: user.id, workspaceId: workspace.id, roleId: role.id })
                .onConflictDoNothing();
            const claimed = await tx
                .update(invitations)
                .set({ acceptedAt: new Date() })
                .where(
                    and(
                        eq(invitations.id, invitation.id),
                        isNull(invitations.acceptedAt),
                        isNull(invitations.revokedAt),
                        gt(invitations.expiresAt, new Date()),
                    ),
                )
                .returning({ id: invitations.id });
            if (!claimed[0]) throw new ApiError(GENERIC, 400);
        });

        try {
            const login = await createSessionForUser({
                slug: portal,
                provider: "password",
                email,
                name: body.name,
                ip: clientIp(request),
                userAgent: request.headers.get("user-agent"),
            });
            return sessionJsonResponse(login.token, portal, {
                id: userId,
                email,
                name: body.name,
                role: roleName,
            });
        } catch (e) {
            if (e instanceof AccessDenied) return fail(GENERIC, 403);
            throw e;
        }
    } catch (e) {
        return handleRouteError("POST /api/auth/invitation/accept", e);
    }
}
