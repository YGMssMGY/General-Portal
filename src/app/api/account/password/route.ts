import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, eq, isNull, ne } from "drizzle-orm";
import { sessions, users } from "@/db/schema";
import { fail, handleRouteError, ok, parseBody } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { requireTenant, sha256Hex } from "@/lib/tenant";

const changeSchema = z.object({
    currentPassword: z.string().min(1).max(256),
    newPassword: z.string().min(12).max(256),
});

export async function PUT(request: NextRequest) {
    try {
        const t = await requireTenant(request, {});
        const body = await parseBody(changeSchema, request);
        const user = await t.db.query.users.findFirst({
            where: eq(users.id, t.userId),
            columns: { id: true, passwordHash: true },
        });
        if (
            !user?.passwordHash ||
            !(await verifyPassword(body.currentPassword, user.passwordHash))
        ) {
            return fail("Current password is incorrect", 401);
        }
        await t.db
            .update(users)
            .set({ passwordHash: await hashPassword(body.newPassword) })
            .where(eq(users.id, t.userId));
        await t.db
            .update(sessions)
            .set({ revokedAt: new Date() })
            .where(
                and(
                    eq(sessions.userId, t.userId),
                    ne(sessions.tokenHash, sha256Hex(t.token)),
                    isNull(sessions.revokedAt),
                ),
            );
        return ok({ changed: true });
    } catch (e) {
        return handleRouteError("PUT /api/account/password", e);
    }
}
