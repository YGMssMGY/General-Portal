import { NextRequest, NextResponse } from "next/server";
import { success, error } from "@/lib/api-response";

export class ApiError extends Error {
    readonly status: number;
    constructor(message: string, status = 400) {
        super(message);
        this.status = status;
    }
}

export function ok<T>(data: T, status = 200) {
    return success(data, status);
}

export function fail(message: string, status = 400) {
    return error(message, status);
}

export function handleRouteError(route: string, e: unknown) {
    if (e instanceof ApiError) return error(e.message, e.status);
    console.error(route, e);
    return error("Internal server error", 500);
}

export function parsePagination(searchParams: URLSearchParams): {
    limit: number;
    cursor: string | null;
    page: number;
} {
    const rawLimit = Number.parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Math.min(100, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));
    const cursor = searchParams.get("cursor");
    const rawPage = Number.parseInt(searchParams.get("page") ?? "1", 10);
    const page = Math.max(1, Number.isFinite(rawPage) ? rawPage : 1);
    return { limit, cursor, page };
}

export function decodeCursor(cursor: string | null): { createdAt: string; id: string } | null {
    if (!cursor) return null;
    try {
        const raw = Buffer.from(cursor, "base64url").toString("utf8");
        const [createdAt, id] = raw.split("|");
        if (!createdAt || !id) return null;
        const d = new Date(createdAt);
        if (Number.isNaN(d.getTime())) return null;
        return { createdAt: d.toISOString(), id };
    } catch {
        return null;
    }
}

export function encodeCursor(createdAt: Date | string, id: string): string {
    const iso = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
    return Buffer.from(`${iso}|${id}`, "utf8").toString("base64url");
}

export async function parseBody<T>(
    schema: {
        safeParse: (v: unknown) =>
            | { success: true; data: T }
            | {
                  success: false;
                  error: { issues: Array<{ path: PropertyKey[]; message: string }> };
              };
    },
    request: NextRequest,
): Promise<T> {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        throw new ApiError("Invalid JSON body", 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new ApiError(
            first ? `${first.path.join(".") || "body"}: ${first.message}` : "Invalid request body",
            400,
        );
    }
    return parsed.data;
}

export { clientIp } from "./client-ip";

export function isUuid(v: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function requireUuid(v: string | null, name = "id"): string {
    if (!v || !isUuid(v)) throw new ApiError(`Invalid ${name}`, 400);
    return v;
}

import { and, eq, lt, or, type SQL, type AnyColumn } from "drizzle-orm";

export function keysetWhere(
    sortCols: Array<{ column: AnyColumn; value: string | number | Date | null }>,
    idColumn: AnyColumn,
    idValue: string,
): SQL {
    const conds: SQL[] = [];
    for (let i = 0; i <= sortCols.length; i++) {
        const prefix = sortCols.slice(0, i).map(({ column, value }) => eq(column, value));
        if (i < sortCols.length) {
            const { column, value } = sortCols[i];
            conds.push(
                prefix.length
                    ? and(...prefix, lt(column, value as never))!
                    : lt(column, value as never),
            );
        } else {
            conds.push(
                prefix.length ? and(...prefix, lt(idColumn, idValue))! : lt(idColumn, idValue),
            );
        }
    }
    return or(...conds)!;
}

export function encodeCursorValues(values: Array<string | number>): string {
    return Buffer.from(JSON.stringify(values), "utf8").toString("base64url");
}

export function decodeCursorValues(cursor: string | null): Array<string | number> | null {
    if (!cursor) return null;
    try {
        const v = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as unknown;
        if (!Array.isArray(v) || v.length < 2 || v.length > 3) return null;
        if (!v.every((x) => typeof x === "string" || typeof x === "number")) return null;
        return v as Array<string | number>;
    } catch {
        return null;
    }
}

export { NextResponse };
export type { NextRequest };
