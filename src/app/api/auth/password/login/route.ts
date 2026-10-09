import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { ApiError, clientIp, fail, handleRouteError, parseBody } from "@/lib/api";
import { error as apiError } from "@/lib/api-response";
import { verifyPassword } from "@/lib/auth/passwords";
import { isProviderAllowed, unavailable } from "@/lib/auth/providers";
import { checkRateLimit, rateKey } from "@/lib/auth/rate-limit";
import { AccessDenied, createSessionForUser, sessionJsonResponse } from "@/lib/auth/session";
import { resolvePortalSlug } from "@/lib/tenant";

const emailSchema = z.string().trim().min(3).max(320).toLowerCase().pipe(z.email());

const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1).max(256),
});

export async function POST(request: NextRequest) {
    try {
        const body = await parseBody(loginSchema, request);
        const portal = resolvePortalSlug(request);
        checkRateLimit(rateKey(clientIp(request), "password"));
        if (!isProviderAllowed(portal, "password")) throw new ApiError(unavailable, 503);
        const db = getDb(portal);
        const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
        if (!user?.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
            return fail("Invalid email or password", 401);
        }
        try {
            const login = await createSessionForUser({
                slug: portal,
                provider: "password",
                email: user.email,
                ip: clientIp(request),
                userAgent: request.headers.get("user-agent"),
            });
            return sessionJsonResponse(login.token, login.portal, {
                id: user.id,
                email: user.email,
                name: user.name,
            });
        } catch (e) {
            if (e instanceof AccessDenied) return apiError("AccessDenied", 403);
            throw e;
        }
    } catch (e) {
        return handleRouteError("auth/password/login", e);
    }
}
