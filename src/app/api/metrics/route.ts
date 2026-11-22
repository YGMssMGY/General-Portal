import type { NextRequest } from "next/server";
import { listPortalSlugs, portalDbUrl } from "@/db/client";
import { authenticateOps } from "@/ops/lib/auth";
import { withClient } from "@/tui/lib/tui-db";

export const revalidate = 30;

let cached: { at: number; body: string } | null = null;

async function collect(): Promise<string> {
    const lines: string[] = [
        "# HELP general_portal_up Whether the application is running.",
        "# TYPE general_portal_up gauge",
        "general_portal_up 1",
        "# HELP general_portal_process_uptime_seconds Process uptime in seconds.",
        "# TYPE general_portal_process_uptime_seconds gauge",
        `general_portal_process_uptime_seconds ${Math.floor(process.uptime())}`,
    ];
    const mem = process.memoryUsage();
    for (const [name, value] of Object.entries(mem)) {
        lines.push(`# HELP general_portal_memory_${name}_bytes Process memory ${name}.`);
        lines.push(`# TYPE general_portal_memory_${name}_bytes gauge`);
        lines.push(`general_portal_memory_${name}_bytes ${value}`);
    }
    for (const slug of listPortalSlugs()) {
        const url = portalDbUrl(slug);
        if (!url) continue;
        try {
            const row = await withClient(url, async (c) => {
                const r = await c.query<{ sessions: string; size: string }>(
                    'SELECT (SELECT COUNT(*)::text FROM sessions WHERE "revokedAt" IS NULL) AS sessions, pg_size_pretty(pg_database_size(current_database())) AS size',
                );
                return r.rows[0];
            });
            lines.push(
                `general_portal_active_sessions{portal="${slug}"} ${Number(row?.sessions ?? 0)}`,
            );
        } catch {
            lines.push(`general_portal_active_sessions{portal="${slug}"} -1`);
        }
    }
    return `${lines.join("\n")}\n`;
}

export async function GET(request: NextRequest) {
    const auth = authenticateOps(request);
    if (auth.error || !auth.ctx) {
        return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }
    if (!cached || Date.now() - cached.at > 30_000)
        cached = { at: Date.now(), body: await collect() };
    return new Response(cached.body, {
        headers: {
            "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}
