import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, listPortalSlugs, type PortalDb } from "@/db/client";
import { authIdentities, authPending, memberships, sessions, users, workspaces } from "@/db/schema";
import { config } from "@/config";
import { ApiError, ok } from "@/lib/api";
import { logger } from "@/lib/logger";
import { newSessionToken, sessionCookieHeader, sessionExpiry } from "@/lib/tenant";
import { emailAllowed, getPortalAuthConfig, secureCookies } from "@/lib/auth/providers";

export class AccessDenied extends Error {
    constructor() {
        super("AccessDenied");
    }
}

export class ContactAdmin extends Error {
    constructor() {
        super("This sign-in is linked to a different account. Contact an administrator.");
    }
}

export interface ResolvedLogin {
    token: string;
    userId: string;
    portal: string;
}

export async function consumeAuthPending(
    provider: string,
    state: string,
    hint: string | null,
): Promise<{ slug: string; db: PortalDb; pending: typeof authPending.$inferSelect } | null> {
    const slugs = hint ? [hint, ...listPortalSlugs().filter((s) => s !== hint)] : listPortalSlugs();
    for (const slug of slugs) {
        let db: PortalDb;
        try {
            db = getDb(slug);
        } catch {
            continue;
        }
        try {
            const rows = await db
                .select()
                .from(authPending)
                .where(and(eq(authPending.provider, provider), eq(authPending.state, state)))
                .limit(1);
            const pending = rows[0];
            if (!pending) continue;
            await db.delete(authPending).where(eq(authPending.id, pending.id));
            return { slug, db, pending };
        } catch {
            continue;
        }
    }
    return null;
}

async function resolveBasisUser(
    db: PortalDb,
    email: string,
    name: string | null,
    image: string | null,
    sub: string,
): Promise<typeof users.$inferSelect> {
    const bySub = await db.query.authIdentities.findFirst({
        where: and(
            eq(authIdentities.provider, "basis-auth"),
            eq(authIdentities.providerAccountId, sub),
        ),
    });
    if (bySub) {
        const linked = await db.query.users.findFirst({ where: eq(users.id, bySub.userId) });
        if (!linked) throw new AccessDenied();
        return linked;
    }
    const byEmail = (await db.query.users.findFirst({ where: eq(users.email, email) })) ?? null;
    if (byEmail) {
        const existing = await db.query.authIdentities.findFirst({
            where: and(
                eq(authIdentities.userId, byEmail.id),
                eq(authIdentities.provider, "basis-auth"),
            ),
        });
        if (existing && existing.providerAccountId !== sub) throw new ContactAdmin();
        if (!existing) {
            await db.insert(authIdentities).values({
                userId: byEmail.id,
                provider: "basis-auth",
                providerAccountId: sub,
                email,
            });
        }
        return byEmail;
    }
    const created = await db
        .insert(users)
        .values({ email, name, image, emailVerified: new Date() })
        .returning();
    const fresh = created[0];
    await db
        .insert(authIdentities)
        .values({ userId: fresh.id, provider: "basis-auth", providerAccountId: sub, email });
    return fresh;
}

export async function createSessionForUser(input: {
    slug: string;
    provider: string;
    email: string;
    name?: string | null;
    image?: string | null;
    sub?: string | null;
    ip?: string | null;
    userAgent?: string | null;
}): Promise<ResolvedLogin> {
    const db = getDb(input.slug);
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, input.slug),
    });
    if (!workspace) throw new ApiError("Unknown workspace", 404);
    const email = input.email.trim().toLowerCase();
    if (!emailAllowed(email, getPortalAuthConfig(input.slug).allowedDomains))
        throw new AccessDenied();

    let user: typeof users.$inferSelect | null;
    if (input.provider === "basis-auth" && input.sub) {
        user = await resolveBasisUser(
            db,
            email,
            input.name ?? null,
            input.image ?? null,
            input.sub,
        );
    } else {
        user =
            (await db.query.users.findFirst({ where: eq(users.email, email) })) ??
            (email !== input.email.trim()
                ? ((await db.query.users.findFirst({
                      where: eq(users.email, input.email.trim()),
                  })) ?? null)
                : null);
        if (!user) {
            const created = await db
                .insert(users)
                .values({
                    email,
                    name: input.name ?? null,
                    image: input.image ?? null,
                    emailVerified: new Date(),
                })
                .returning();
            user = created[0];
        }
    }

    if (!user || user.disabled) throw new AccessDenied();

    const member = await db.query.memberships.findFirst({
        where: and(eq(memberships.workspaceId, workspace.id), eq(memberships.userId, user.id)),
    });
    if (!member) {
        logger.info(
            { portal: input.slug, provider: input.provider },
            "login denied: no membership",
        );
        throw new AccessDenied();
    }

    const { token, tokenHash } = newSessionToken();
    await db.insert(sessions).values({
        userId: user.id,
        tokenHash,
        provider: input.provider,
        expiresAt: sessionExpiry(),
        ipAddress: input.ip ?? null,
        userAgent: input.userAgent ?? null,
    });
    return { token, userId: user.id, portal: input.slug };
}

export function portalCookieHeader(portal: string): string {
    const parts = [
        `${config.portalCookie}=${portal}`,
        "Path=/",
        "SameSite=Lax",
        `Max-Age=${30 * 24 * 3600}`,
    ];
    if (secureCookies()) parts.push("Secure");
    return parts.join("; ");
}

export function returnToCookieHeader(value: string): string {
    const parts = [
        `gp_next=${encodeURIComponent(value)}`,
        "Path=/",
        "SameSite=Lax",
        "Max-Age=600",
        "HttpOnly",
    ];
    if (secureCookies()) parts.push("Secure");
    return parts.join("; ");
}

export function clearReturnToCookieHeader(): string {
    return "gp_next=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly";
}

export function sessionRedirectResponse(
    token: string,
    portal: string,
    returnTo: string | null,
): NextResponse {
    const res = NextResponse.redirect(new URL(returnTo ?? `/${portal}/dashboard`, config.baseUrl));
    res.headers.append("Set-Cookie", sessionCookieHeader(token, secureCookies()));
    res.headers.append("Set-Cookie", portalCookieHeader(portal));
    res.headers.append("Set-Cookie", clearReturnToCookieHeader());
    return res;
}

export function sessionJsonResponse<T>(token: string, portal: string, data: T): NextResponse {
    const res = ok(data);
    res.headers.append("Set-Cookie", sessionCookieHeader(token, secureCookies()));
    res.headers.append("Set-Cookie", portalCookieHeader(portal));
    return res;
}

export function readReturnTo(request: {
    cookies: { get(name: string): { value: string } | undefined };
}): string | null {
    const raw = request.cookies.get("gp_next")?.value;
    if (!raw) return null;
    try {
        const v = decodeURIComponent(raw);
        if (v.startsWith("/") && !v.startsWith("//") && !v.includes("\\")) return v;
    } catch {
        return null;
    }
    return null;
}

export function accessDeniedRedirect(): NextResponse {
    return NextResponse.redirect(new URL("/login?error=AccessDenied", config.baseUrl));
}

export function callbackErrorRedirect(): NextResponse {
    return NextResponse.redirect(new URL("/login?error=Callback", config.baseUrl));
}
