import { createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { config } from "@/config";
import { listPortalSlugs, portalDbUrl } from "@/db/client";
import { runTsx, withClient } from "@/tui/lib/tui-db";
import { workspaceIdFor } from "./backup";
import type { ActionDefinition, OpsContext, OpsScope } from "../types";

const slug = z
    .string()
    .regex(/^[a-z0-9][a-z0-9_-]{0,63}$/)
    .describe("Portal slug");
const email = z.string().email().describe("User email");
const scopes = z.array(z.enum(["ops:read", "ops:deploy", "ops:backup", "ops:danger"])).min(1);

function b64url(input: string): string {
    return Buffer.from(input, "utf8").toString("base64url");
}

export function issueToken(
    subject: string,
    granted: OpsScope[],
    ttlSeconds = 3600,
): { token: string; expiresAt: string } {
    const exp = Math.floor(Date.now() / 1000) + Math.max(60, Math.min(86400, ttlSeconds));
    const payload = b64url(JSON.stringify({ sub: subject, scopes: granted, exp }));
    const sig = createHmac("sha256", config.opsSecret).update(payload).digest("base64url");
    return { token: `${payload}.${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
}

export function verifyToken(token: string): {
    ok: boolean;
    subject?: string;
    scopes?: OpsScope[];
} {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return { ok: false };
    const expected = createHmac("sha256", config.opsSecret).update(payload).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
    try {
        const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
            sub: string;
            scopes: OpsScope[];
            exp: number;
        };
        if (parsed.exp < Math.floor(Date.now() / 1000)) return { ok: false };
        return { ok: true, subject: parsed.sub, scopes: parsed.scopes };
    } catch {
        return { ok: false };
    }
}

function flatten(obj: Record<string, unknown>, prefix = "", out = new Set<string>()): Set<string> {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v))
            flatten(v as Record<string, unknown>, key, out);
        else out.add(key);
    }
    return out;
}

export const systemActions: ActionDefinition[] = [
    {
        id: "log.tail",
        group: "system",
        summary: "Tail recent operator audit entries",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ limit: z.number().int().min(1).max(500).default(50) }),
        run: async ({ limit }) => {
            try {
                const text = fs.readFileSync(path.resolve(process.cwd(), ".tui-audit.log"), "utf8");
                return text
                    .split("\n")
                    .filter(Boolean)
                    .slice(-limit)
                    .map((line) => {
                        try {
                            return JSON.parse(line) as Record<string, unknown>;
                        } catch {
                            return { raw: line };
                        }
                    });
            } catch {
                return [];
            }
        },
    },
    {
        id: "ops.token",
        group: "ops",
        summary: "Issue a scoped, short-lived operator token",
        scopes: ["ops:danger"],
        destructive: false,
        params: z.object({
            subject: z.string().min(1).max(120),
            scopes,
            ttl: z.number().int().min(60).max(86400).default(3600),
        }),
        run: async ({ subject, scopes: granted, ttl }) => {
            const issued = issueToken(subject, granted, ttl);
            return {
                subject,
                scopes: granted,
                ...issued,
                note: "Store this token securely; it is shown once.",
            };
        },
    },
    {
        id: "ops.whoami",
        group: "ops",
        summary: "Show the current operator identity and scopes",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async (_input, ctx: OpsContext) => ({
            operatorId: ctx.operatorId,
            source: ctx.source,
            scopes: ctx.scopes,
            ip: ctx.ip ?? null,
        }),
    },
    {
        id: "ops.explain",
        group: "ops",
        summary: "Explain an action: params, scopes, confirmation rule and example commands",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ action: z.string().min(1) }),
        run: async ({ action }) => {
            const { describeAction } = await import("../registry");
            return describeAction(action);
        },
    },
    {
        id: "ops.status",
        group: "ops",
        summary: "Show operator API configuration without revealing secrets",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => ({
            tokenConfigured: Boolean(config.opsToken),
            secretConfigured: config.opsSecret.length > 0,
            ipAllowlistConfigured: config.opsAllowedIps.length > 0,
            portals: listPortalSlugs().length,
            baseUrl: config.baseUrl,
        }),
    },
    {
        id: "config.check",
        group: "config",
        summary: "Validate deployment.yaml, env names, seed packs and databases",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const r = await runTsx("scripts/config.ts", ["check"]);
            return { ok: r.code === 0, output: r.out.slice(-12000) };
        },
    },
    {
        id: "config.init",
        group: "config",
        summary: "Write a starter deployment YAML without touching the live file",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const r = await runTsx("scripts/config.ts", ["init"]);
            return { ok: r.code === 0, output: r.out.slice(-6000) };
        },
    },
    {
        id: "config.diff",
        group: "config",
        summary: "Compare YAML branding with live workspace rows",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const r = await runTsx("scripts/config.ts", ["diff"]);
            return { ok: r.code === 0, output: r.out.slice(-12000) };
        },
    },
    {
        id: "config.doctor",
        group: "config",
        summary: "Run all configuration and connectivity checks",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const r = await runTsx("scripts/config.ts", ["doctor"]);
            return { ok: r.code === 0, output: r.out.slice(-16000) };
        },
    },
    {
        id: "user.list",
        group: "user",
        summary: "List workspace members with roles",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug, limit: z.number().int().min(1).max(500).default(100) }),
        run: async ({ slug, limit }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            const wid = await workspaceIdFor(slug);
            return withClient(url, async (c) => {
                const r = await c.query(
                    'SELECT u.id, u.email, u.name, u.disabled, r.name AS role FROM users u JOIN memberships m ON m."userId" = u.id LEFT JOIN roles r ON r.id = m."roleId" WHERE m."workspaceId" = $1 ORDER BY u.email LIMIT $2',
                    [wid, limit],
                );
                return r.rows;
            });
        },
    },
    {
        id: "user.role",
        group: "user",
        summary: "Change a member's role by name",
        scopes: ["ops:deploy"],
        destructive: false,
        params: z.object({ slug, email, role: z.enum(["admin", "officer", "member"]) }),
        run: async ({ slug, email, role }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            const wid = await workspaceIdFor(slug);
            return withClient(url, async (c) => {
                const r = await c.query(
                    'UPDATE memberships SET "roleId" = (SELECT id FROM roles WHERE "workspaceId" = $1 AND name = $2 LIMIT 1) WHERE "workspaceId" = $1 AND "userId" = (SELECT id FROM users WHERE email = $3 LIMIT 1) RETURNING id',
                    [wid, role, email.toLowerCase()],
                );
                return { slug, email, role, updated: r.rowCount ?? 0 };
            });
        },
    },
    {
        id: "user.disable",
        group: "user",
        summary: "Disable or enable a user account",
        scopes: ["ops:danger"],
        destructive: false,
        params: z.object({ slug, email, disabled: z.boolean().default(true) }),
        run: async ({ slug, email, disabled }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            return withClient(url, async (c) => {
                const r = await c.query(
                    "UPDATE users SET disabled = $1 WHERE email = $2 RETURNING id",
                    [disabled, email.toLowerCase()],
                );
                return { slug, email, disabled, updated: r.rowCount ?? 0 };
            });
        },
    },
    {
        id: "user.sessions",
        group: "user",
        summary: "List active sessions for a user",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({ slug, email }),
        run: async ({ slug, email }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            return withClient(url, async (c) => {
                const r = await c.query(
                    'SELECT id, provider, "createdAt", "lastSeenAt", "expiresAt" FROM sessions WHERE "userId" = (SELECT id FROM users WHERE email = $1 LIMIT 1) AND "revokedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 100',
                    [email.toLowerCase()],
                );
                return r.rows;
            });
        },
    },
    {
        id: "user.revoke-all",
        group: "user",
        summary: "Revoke every session for a portal",
        scopes: ["ops:danger"],
        destructive: true,
        confirmField: "slug",
        params: z.object({ slug }),
        run: async ({ slug }) => {
            const wid = await workspaceIdFor(slug);
            const url = portalDbUrl(slug);
            if (!url || !wid) throw new Error(`Unknown portal: ${slug}`);
            return withClient(url, async (c) => {
                const r = await c.query(
                    'UPDATE sessions SET "revokedAt" = now() WHERE "workspaceId" = $1 AND "revokedAt" IS NULL',
                    [wid],
                );
                return { slug, revoked: r.rowCount ?? 0 };
            });
        },
    },
    {
        id: "danger.revoke-sessions",
        group: "danger",
        summary: "Alias of user.revoke-all",
        scopes: ["ops:danger"],
        destructive: true,
        confirmField: "slug",
        params: z.object({ slug }),
        run: async ({ slug }) => {
            const wid = await workspaceIdFor(slug);
            const url = portalDbUrl(slug);
            if (!url || !wid) throw new Error(`Unknown portal: ${slug}`);
            return withClient(url, async (c) => {
                const r = await c.query(
                    'UPDATE sessions SET "revokedAt" = now() WHERE "workspaceId" = $1 AND "revokedAt" IS NULL',
                    [wid],
                );
                return { slug, revoked: r.rowCount ?? 0 };
            });
        },
    },
    {
        id: "danger.disable-user",
        group: "danger",
        summary: "Disable a user by email with typed confirmation",
        scopes: ["ops:danger"],
        destructive: true,
        confirmField: "email",
        params: z.object({ slug, email }),
        run: async ({ slug, email }) => {
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            return withClient(url, async (c) => {
                const r = await c.query(
                    "UPDATE users SET disabled = true WHERE email = $1 RETURNING id",
                    [email.toLowerCase()],
                );
                return { slug, email, disabled: (r.rowCount ?? 0) > 0 };
            });
        },
    },
    {
        id: "data.i18n-missing",
        group: "data",
        summary: "Report locale keys missing from any of the five catalogues",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            const dir = path.resolve(process.cwd(), "messages");
            const locales = ["en-US", "zh-CN", "de-DE", "fr-FR", "es-ES"];
            const catalogs = new Map<string, Set<string>>();
            for (const l of locales) {
                catalogs.set(
                    l,
                    flatten(
                        JSON.parse(fs.readFileSync(path.join(dir, `${l}.json`), "utf8")) as Record<
                            string,
                            unknown
                        >,
                    ),
                );
            }
            const baseline = catalogs.get("en-US") ?? new Set<string>();
            return locales.map((l) => ({
                locale: l,
                missing: [...baseline].filter((k) => !catalogs.get(l)?.has(k)),
            }));
        },
    },
    {
        id: "data.export",
        group: "data",
        summary: "Export a portal database as plain SQL",
        scopes: ["ops:backup"],
        destructive: false,
        params: z.object({ slug }),
        run: async ({ slug }) => {
            const { backupFilePath, pgDump } = await import("@/tui/lib/tui-db");
            const url = portalDbUrl(slug);
            if (!url) throw new Error(`Unknown portal: ${slug}`);
            const r = await pgDump(url, backupFilePath(slug, "export"));
            return { slug, ok: r.ok, bytes: r.bytes };
        },
    },
    {
        id: "bench",
        group: "system",
        summary: "Time a trivial indexed query on every portal",
        scopes: ["ops:read"],
        destructive: false,
        params: z.object({}),
        run: async () => {
            return Promise.all(
                listPortalSlugs().map(async (s) => {
                    const url = portalDbUrl(s);
                    if (!url) return { slug: s, ms: null };
                    const start = performance.now();
                    await withClient(url, async (c) => {
                        await c.query("SELECT id FROM workspaces WHERE slug = $1 LIMIT 1", [s]);
                    });
                    return { slug: s, ms: Math.round((performance.now() - start) * 100) / 100 };
                }),
            );
        },
    },
];
