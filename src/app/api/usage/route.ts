import type { NextRequest } from "next/server";
import { and, count, countDistinct, eq, gt, isNull, or, sql } from "drizzle-orm";
import { apiTokens, attachments, invitations, memberships, sessions } from "@/db/schema";
import { limitsFor } from "@/lib/deployment";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "view_reports",
            module: "members",
        });
        const limits = limitsFor(t.portal);
        const now = new Date();

        const [attachmentRows, sessionRows, invitationRows, memberRows, tokenRows] =
            await Promise.all([
                t.db
                    .select({
                        n: count(),
                        bytes: sql<string>`coalesce(sum(${attachments.fileSize}), 0)::bigint`,
                    })
                    .from(attachments)
                    .where(
                        and(
                            eq(attachments.workspaceId, t.workspaceId),
                            isNull(attachments.deletedAt),
                        ),
                    ),
                t.db
                    .select({ n: countDistinct(sessions.id) })
                    .from(sessions)
                    .innerJoin(memberships, eq(memberships.userId, sessions.userId))
                    .where(
                        and(
                            eq(memberships.workspaceId, t.workspaceId),
                            isNull(sessions.revokedAt),
                            gt(sessions.expiresAt, now),
                        ),
                    ),
                t.db
                    .select({ n: count() })
                    .from(invitations)
                    .where(
                        and(
                            eq(invitations.workspaceId, t.workspaceId),
                            isNull(invitations.acceptedAt),
                            isNull(invitations.revokedAt),
                            gt(invitations.expiresAt, now),
                        ),
                    ),
                t.db
                    .select({ n: count() })
                    .from(memberships)
                    .where(eq(memberships.workspaceId, t.workspaceId)),
                t.db
                    .select({ n: count() })
                    .from(apiTokens)
                    .where(
                        and(
                            eq(apiTokens.workspaceId, t.workspaceId),
                            or(isNull(apiTokens.expiresAt), gt(apiTokens.expiresAt, now)),
                        ),
                    ),
            ]);

        const usedMb = Number(attachmentRows[0]?.bytes ?? 0) / (1024 * 1024);
        const uploadLimit = limits.uploadMb;
        const percent =
            uploadLimit > 0 ? Math.min(100, Math.round((usedMb / uploadLimit) * 100)) : 0;

        return ok({
            portal: t.portal,
            limits,
            usage: {
                uploadMb: {
                    used: Math.round(usedMb * 100) / 100,
                    limit: uploadLimit,
                    percent,
                },
                seats: { used: memberRows[0]?.n ?? 0, limit: null },
                sessions: { active: sessionRows[0]?.n ?? 0 },
                invitations: { pending: invitationRows[0]?.n ?? 0 },
                tokens: { active: tokenRows[0]?.n ?? 0 },
            },
            alerts: [],
        });
    } catch (e) {
        return handleRouteError("GET /api/usage", e);
    }
}
