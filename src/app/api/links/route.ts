import type { NextRequest } from "next/server";
import { z } from "zod";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { linkItems } from "@/db/schema";
import {
    clientIp,
    decodeCursorValues,
    encodeCursorValues,
    handleRouteError,
    keysetWhere,
    ok,
    parseBody,
    parsePagination,
} from "@/lib/api";
import { requireTenant } from "@/lib/tenant";
import { emitSideEffects } from "@/lib/side-effects";

function body<T>(schema: {
    safeParse: (
        v: unknown,
    ) =>
        | { success: true; data: T }
        | { success: false; error: { issues: Array<{ path: PropertyKey[]; message: string }> } };
}) {
    return {
        safeParse: (v: unknown) => {
            const r = schema.safeParse(v);
            if (r.success) return { success: true as const, data: r.data };
            return {
                success: false as const,
                error: {
                    issues: r.error.issues.map((i) => ({
                        path: i.path.filter(
                            (p): p is string | number =>
                                typeof p === "string" || typeof p === "number",
                        ),
                        message: i.message,
                    })),
                },
            };
        },
    };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

const createSchema = z.object({
    title: z.string().trim().min(1).max(200),
    url: z.string().trim().min(1).max(2000),
    description: z.string().trim().max(2000).nullish(),
    category: z.string().trim().max(100).nullish(),
});

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "files" });
        const sp = request.nextUrl.searchParams;
        const { limit, cursor } = parsePagination(sp);
        const category = sp.get("category")?.trim() || null;
        const q = sp.get("q")?.trim() || null;

        const cVals = decodeCursorValues(cursor);
        const cDate =
            cVals && typeof cVals[0] === "string" && !Number.isNaN(new Date(cVals[0]).getTime())
                ? new Date(cVals[0])
                : null;
        const cId = cVals && typeof cVals[1] === "string" ? cVals[1] : null;
        const cursorCond =
            cDate && cId
                ? keysetWhere([{ column: linkItems.createdAt, value: cDate }], linkItems.id, cId)
                : undefined;

        const rows = await t.db.query.linkItems.findMany({
            where: and(
                eq(linkItems.workspaceId, t.workspaceId),
                isNull(linkItems.deletedAt),
                category ? eq(linkItems.category, category) : undefined,
                q ? ilike(linkItems.title, `%${escapeLike(q)}%`) : undefined,
                cursorCond,
            ),
            orderBy: [desc(linkItems.createdAt), desc(linkItems.id)],
            limit: limit + 1,
            with: { uploadedBy: { columns: { id: true, name: true, image: true } } },
        });

        const items = rows.slice(0, limit).map((r) => ({
            ...r,
            createdBy: r.uploadedBy ? { id: r.uploadedBy.id, name: r.uploadedBy.name } : null,
        }));
        const last = items[items.length - 1];
        const nextCursor =
            rows.length > limit && last
                ? encodeCursorValues([last.createdAt.toISOString(), last.id])
                : null;
        const res = ok(items);
        res.headers.set("X-Next-Cursor", nextCursor ?? "");
        return res;
    } catch (e) {
        return handleRouteError("GET /api/links", e);
    }
}

export async function POST(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "files" });
        const data = await parseBody(body(createSchema), request);

        const [link] = await t.db
            .insert(linkItems)
            .values({
                workspaceId: t.workspaceId,
                title: data.title,
                url: data.url,
                description: data.description ?? null,
                category: data.category ?? null,
                uploadedById: t.userId,
            })
            .returning();

        await emitSideEffects(t.db, {
            workspaceId: t.workspaceId,
            userId: t.userId,
            action: "created",
            entityType: "link",
            entityId: link.id,
            metadata: { title: link.title },
            ipAddress: clientIp(request),
        });

        return ok(link, 201);
    } catch (e) {
        return handleRouteError("POST /api/links", e);
    }
}
