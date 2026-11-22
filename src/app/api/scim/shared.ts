import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { config, readEnv } from "@/config";
import { getDb, listPortalSlugs, type PortalDb } from "@/db/client";
import { users, workspaces } from "@/db/schema";
import { clientIp } from "@/lib/client-ip";
import { writeAuditLog } from "@/lib/audit";

export const USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
export const GROUP_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:Group";
export const LIST_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:ListResponse";
export const ERROR_SCHEMA = "urn:ietf:params:scim:api:messages:2.0:Error";

export type Detail = (key: string, fallback: string) => string;

export function scimError(status: number, detail: string, scimType?: string) {
    return NextResponse.json(
        {
            schemas: [ERROR_SCHEMA],
            detail,
            status: String(status),
            ...(scimType ? { scimType } : {}),
        },
        { status },
    );
}

function equalToken(presented: string, expected: string): boolean {
    const a = createHash("sha256").update(presented).digest();
    const b = createHash("sha256").update(expected).digest();
    return timingSafeEqual(a, b);
}

function configuredTokens(): Array<{ slug: string; token: string }> {
    const slugs = listPortalSlugs();
    const first = slugs[0];
    const entries: Array<{ slug: string; token: string }> = [];
    for (const slug of slugs) {
        const token =
            readEnv(`SCIM_TOKEN_${slug.toUpperCase().replace(/-/g, "_")}`) ??
            (slug === first ? config.scimToken : "");
        if (token) entries.push({ slug, token });
    }
    return entries;
}

export function authorize(request: NextRequest, td: Detail): { slug: string } | NextResponse {
    const entries = configuredTokens();
    if (entries.length === 0) {
        return scimError(501, td("notConfigured", "Service is not configured."));
    }
    const match = /^Bearer\s+(.+)$/.exec((request.headers.get("authorization") ?? "").trim());
    const presented = match?.[1]?.trim() ?? "";
    if (!presented) {
        return scimError(401, td("unauthorized", "Invalid or missing bearer token."));
    }
    for (const entry of entries) {
        if (equalToken(presented, entry.token)) return { slug: entry.slug };
    }
    return scimError(401, td("unauthorized", "Invalid or missing bearer token."));
}

export async function workspaceContext(
    slug: string,
    td: Detail,
): Promise<{ db: PortalDb; workspaceId: string } | NextResponse> {
    const db = getDb(slug);
    const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.slug, slug) });
    if (!workspace) return scimError(404, td("notFound", "Workspace not found."));
    return { db, workspaceId: workspace.id };
}

export function toScimUser(user: typeof users.$inferSelect) {
    const parts = (user.name ?? "").trim().split(/\s+/).filter(Boolean);
    const givenName = parts.shift() ?? "";
    const familyName = parts.join(" ");
    return {
        schemas: [USER_SCHEMA],
        id: user.id,
        userName: user.email,
        active: !user.disabled,
        displayName: user.name ?? user.email,
        ...(user.name ? { name: { givenName, familyName, formatted: user.name } } : {}),
        emails: [{ value: user.email, primary: true }],
        meta: { resourceType: "User" },
    };
}

export async function scimAudit(params: {
    db: PortalDb;
    workspaceId: string;
    request: NextRequest;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
}): Promise<void> {
    await writeAuditLog(
        {
            workspaceId: params.workspaceId,
            action: params.action,
            entityType: params.entityType,
            entityId: params.entityId,
            metadata: params.metadata,
            ipAddress: clientIp(params.request) || undefined,
        },
        params.db,
        true,
    );
}
