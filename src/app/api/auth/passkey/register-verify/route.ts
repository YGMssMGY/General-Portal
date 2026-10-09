import { and, desc, eq, gt } from "drizzle-orm";
import { NextRequest } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod";
import { getDb } from "@/db/client";
import { authPending, passkeys } from "@/db/schema";
import { fail, handleRouteError, ok, parseBody } from "@/lib/api";
import { expectedOrigin, rpId } from "@/lib/auth/providers";
import { getSession, resolvePortalSlug } from "@/lib/tenant";

const verifySchema = z.object({
    response: z.custom<RegistrationResponseJSON>((v) => typeof v === "object" && v !== null),
    state: z.string().min(1).max(256).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await parseBody(verifySchema, request);
        const portal = resolvePortalSlug(request);
        const session = await getSession(request);
        if (!session) return fail("Unauthorized", 401);
        const db = getDb(portal);
        let pending;
        if (body.state) {
            const rows = await db
                .select()
                .from(authPending)
                .where(
                    and(
                        eq(authPending.provider, "passkey-register"),
                        eq(authPending.state, body.state),
                    ),
                )
                .limit(1);
            pending = rows[0];
        } else {
            const rows = await db.query.authPending.findMany({
                where: and(
                    eq(authPending.provider, "passkey-register"),
                    eq(authPending.email, session.user.email),
                    gt(authPending.expiresAt, new Date()),
                ),
                orderBy: [desc(authPending.createdAt)],
                limit: 1,
            });
            pending = rows[0];
        }
        if (!pending || pending.expiresAt.getTime() < Date.now() || !pending.nonce) {
            return fail("Registration session expired", 400);
        }
        const result = await verifyRegistrationResponse({
            response: body.response,
            expectedChallenge: pending.nonce,
            expectedOrigin: expectedOrigin(),
            expectedRPID: rpId(),
        });
        if (!result.verified || !result.registrationInfo) return fail("Registration failed", 400);
        const credential = result.registrationInfo.credential;
        await db.delete(authPending).where(eq(authPending.id, pending.id));
        await db
            .insert(passkeys)
            .values({
                userId: session.user.id,
                credentialId: credential.id,
                publicKey: Buffer.from(credential.publicKey).toString("base64url"),
                counter: credential.counter,
                transports: credential.transports ?? [],
            })
            .onConflictDoNothing({ target: passkeys.credentialId });
        return ok({ verified: true });
    } catch (e) {
        return handleRouteError("auth/passkey/register-verify", e);
    }
}
