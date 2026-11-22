import { NextRequest } from "next/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { notificationPrefs } from "@/db/schema";
import { handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const prefsSchema = z.array(
    z.object({
        channel: z.string().trim().min(1).max(64),
        enabled: z.boolean(),
        digest: z.enum(["never", "daily", "weekly"]),
    }),
);
type PrefsInput = z.infer<typeof prefsSchema>;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_notifications",
            module: "members",
        });
        const rows = await t.db.query.notificationPrefs.findMany({
            where: eq(notificationPrefs.userId, t.userId),
            orderBy: [asc(notificationPrefs.channel)],
        });
        return ok(rows);
    } catch (e) {
        return handleRouteError("GET /api/notification-prefs", e);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const t = await requireTenant(request, {
            permission: "manage_notifications",
            module: "members",
        });
        const body = await parseBody<PrefsInput>(prefsSchema as never, request);
        const rows = await Promise.all(
            body.map((p) =>
                t.db
                    .insert(notificationPrefs)
                    .values({
                        userId: t.userId,
                        channel: p.channel,
                        enabled: p.enabled,
                        digest: p.digest,
                    })
                    .onConflictDoUpdate({
                        target: [notificationPrefs.userId, notificationPrefs.channel],
                        set: { enabled: p.enabled, digest: p.digest },
                    })
                    .returning()
                    .then((r) => r[0]),
            ),
        );
        return ok(rows.filter(Boolean));
    } catch (e) {
        return handleRouteError("PUT /api/notification-prefs", e);
    }
}
