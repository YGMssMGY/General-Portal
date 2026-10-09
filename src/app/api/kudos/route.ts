import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { kudos, users } from "@/db/schema";
import {
    ApiError,
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
    requireUuid,
} from "@/lib/api";
import { emitSideEffects } from "@/lib/side-effects";
import { requireTenant } from "@/lib/tenant";

const createKudosSchema = z.object({
    receiverId: z.string(),
    message: z.string().nullable().optional(),
});
type CreateKudosInput = z.infer<typeof createKudosSchema>;

const person = { id: true, name: true, image: true } as const;

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const { limit, cursor } = parsePagination(new URL(request.url).searchParams);

        const conds = [eq(kudos.workspaceId, t.workspaceId)];
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
                    keysetWhere([{ column: kudos.createdAt, value: at }], kudos.id, vals[1]),
                );
            }
        }

        const rows = await t.db.query.kudos.findMany({
            where: and(...conds),
            orderBy: [desc(kudos.createdAt), desc(kudos.id)],
            limit: limit + 1,
            with: { sender: { columns: person }, receiver: { columns: person } },
        });

        let nextCursor: string | null = null;
        if (rows.length > limit) {
            const last = rows.pop()!;
            nextCursor = encodeCursorValues([last.createdAt.toISOString(), last.id]);
        }

        const res = ok(rows);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/kudos", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { permission: "send_kudos", module: "members" });
        const body = await parseBody<CreateKudosInput>(createKudosSchema as never, request);
        const receiverId = requireUuid(body.receiverId, "receiverId");
        if (receiverId === t.userId) throw new ApiError("You cannot send kudos to yourself", 400);

        const receiver = await t.db.query.users.findFirst({
            where: eq(users.id, receiverId),
            columns: { id: true, name: true, image: true },
        });
        if (!receiver) throw new ApiError("Receiver not found", 404);

        const id = randomUUID();
        const [[created]] = await Promise.all([
            t.db
                .insert(kudos)
                .values({
                    id,
                    workspaceId: t.workspaceId,
                    senderId: t.userId,
                    receiverId,
                    message: body.message ?? null,
                })
                .returning(),
            emitSideEffects(t.db, {
                workspaceId: t.workspaceId,
                userId: t.userId,
                action: "sent_kudos",
                entityType: "kudos",
                entityId: id,
                metadata: { receiverId, receiverName: receiver.name },
                ipAddress: clientIp(request),
            }),
        ]);

        return ok(
            {
                ...created,
                sender: { id: t.user.id, name: t.user.name, image: t.user.image },
                receiver,
            },
            201,
        );
    } catch (e) {
        return handleRouteError("POST /api/kudos", e);
    }
}
