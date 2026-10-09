import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { memberships } from "@/db/schema";
import {
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

// ponytail: keyset on (createdAt desc, id desc); role grouping stays client-side
// (role names sort alphabetically server-side only if the client re-sorts).
export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "view_members", module: "members" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const conds = [eq(memberships.workspaceId, t.workspaceId)];
        const vals = decodeCursorValues(cursor);
        if (
            vals &&
            vals.length >= 2 &&
            typeof vals[0] === "string" &&
            typeof vals[1] === "string"
        ) {
            const at = new Date(vals[0]);
            if (!Number.isNaN(at.getTime())) {
                conds.push(
                    keysetWhere(
                        [{ column: memberships.createdAt, value: at }],
                        memberships.id,
                        vals[1],
                    ),
                );
            }
        }

        const rows = await t.db.query.memberships.findMany({
            where: and(...conds),
            orderBy: [desc(memberships.createdAt), desc(memberships.id)],
            limit: limit + 1,
            with: {
                role: true,
                user: { columns: { id: true, name: true, email: true, image: true } },
            },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const items = rows.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            role: m.role?.name ?? "member",
            membershipId: m.id,
            joinedAt: m.createdAt,
        }));

        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/members", e);
    }
}
