import { NextRequest } from "next/server";
import { count, desc, eq } from "drizzle-orm";
import { kudos, users } from "@/db/schema";
import { handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });

        const rows = await t.db
            .select({
                userId: kudos.receiverId,
                userName: users.name,
                userEmail: users.email,
                userImage: users.image,
                count: count(kudos.id),
            })
            .from(kudos)
            .innerJoin(users, eq(kudos.receiverId, users.id))
            .where(eq(kudos.workspaceId, t.workspaceId))
            .groupBy(kudos.receiverId, users.name, users.email, users.image)
            .orderBy(desc(count(kudos.id)))
            .limit(10);

        const res = ok(rows);
        res.headers.set("X-Next-Cursor", "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/kudos/leaderboard", e);
    }
}
