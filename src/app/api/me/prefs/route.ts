import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { handleRouteError, ok, parseBody } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

const DEFAULT_WIDGETS = ["tasks", "events", "proposals", "activity", "kudos", "participation"];

const prefsSchema = z.object({
    widgets: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
    theme: z.enum(["dark", "light", "system"]).optional(),
    density: z.enum(["comfortable", "compact"]).optional(),
});
type PrefsInput = z.infer<typeof prefsSchema>;

interface StoredPrefs {
    widgets?: unknown;
    theme?: unknown;
    density?: unknown;
}

function normalize(raw: StoredPrefs): {
    widgets: string[];
    theme: "dark" | "light" | "system";
    density: "comfortable" | "compact";
} {
    const widgets = Array.isArray(raw.widgets)
        ? raw.widgets.filter((w): w is string => typeof w === "string").slice(0, 20)
        : [...DEFAULT_WIDGETS];
    const theme =
        raw.theme === "dark" || raw.theme === "light" || raw.theme === "system"
            ? raw.theme
            : "system";
    const density =
        raw.density === "compact" || raw.density === "comfortable" ? raw.density : "comfortable";
    return { widgets: widgets.length > 0 ? widgets : [...DEFAULT_WIDGETS], theme, density };
}

async function readPrefs(
    db: { execute: (q: unknown) => Promise<unknown> },
    userId: string,
): Promise<StoredPrefs> {
    const res = (await db.execute(
        sql`SELECT "uiPrefs" AS "uiPrefs" FROM "users" WHERE "id" = ${userId} LIMIT 1`,
    )) as unknown as { rows?: Array<{ uiPrefs?: StoredPrefs | string }> };
    const row = res.rows?.[0];
    const v = row?.uiPrefs;
    if (!v) return {};
    if (typeof v === "string") {
        try {
            return JSON.parse(v) as StoredPrefs;
        } catch {
            return {};
        }
    }
    if (typeof v === "object") return v as StoredPrefs;
    return {};
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const stored = await readPrefs(t.db as never, t.userId);
        return ok(normalize(stored));
    } catch (e) {
        return handleRouteError("GET /api/me/prefs", e);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "members" });
        const body = await parseBody<PrefsInput>(prefsSchema as never, request);
        const stored = await readPrefs(t.db as never, t.userId);
        const merged: StoredPrefs = { ...stored };
        if (body.widgets !== undefined) merged.widgets = body.widgets;
        if (body.theme !== undefined) merged.theme = body.theme;
        if (body.density !== undefined) merged.density = body.density;
        const next = normalize(merged);
        await t.db.execute(
            sql`UPDATE "users" SET "uiPrefs" = ${JSON.stringify(next)}::jsonb, "updatedAt" = now() WHERE "id" = ${t.userId}`,
        );
        return ok(next);
    } catch (e) {
        return handleRouteError("PUT /api/me/prefs", e);
    }
}
