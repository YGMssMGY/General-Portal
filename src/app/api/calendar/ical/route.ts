import { NextRequest } from "next/server";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { getDb, listPortalSlugs } from "@/db/client";
import { apiTokens, events, meetings, memberships, tasks } from "@/db/schema";
import { error } from "@/lib/api-response";
import { sha256Hex } from "@/lib/tenant";

const CHUNK_SIZE = 8;

function icsEscape(s: string): string {
    return s
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");
}

function icsDate(d: Date): string {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

async function resolvePortal(slug: string, hash: string): Promise<Response | null> {
    const db = getDb(slug);
    const rows = await db.query.apiTokens.findMany({
        where: eq(apiTokens.tokenHash, hash),
        with: { user: true, workspace: true },
        limit: 1,
    });
    const row = rows[0];
    if (!row || !row.user || row.user.disabled || !row.workspace) return null;
    if (!(row.scopes ?? []).includes("calendar:read")) return null;
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) return null;
    const member = await db.query.memberships.findFirst({
        where: and(
            eq(memberships.workspaceId, row.workspace.id),
            eq(memberships.userId, row.user.id),
        ),
        with: { role: true },
    });
    if (!member) return null;
    if (row.workspace.settings["members"] === false) return error("Module disabled", 403);
    const now = Date.now();
    const start = new Date(now - 90 * 86_400_000);
    const end = new Date(now + 90 * 86_400_000);
    const [eventRows, meetingRows, taskRows] = await Promise.all([
        db.query.events.findMany({
            where: and(
                eq(events.workspaceId, row.workspace.id),
                isNull(events.deletedAt),
                gte(events.startDate, start),
                lte(events.startDate, end),
            ),
            columns: {
                id: true,
                title: true,
                description: true,
                startDate: true,
                endDate: true,
                location: true,
            },
            limit: 500,
        }),
        db.query.meetings.findMany({
            where: and(
                eq(meetings.workspaceId, row.workspace.id),
                isNull(meetings.deletedAt),
                gte(meetings.startTime, start),
                lte(meetings.startTime, end),
            ),
            columns: {
                id: true,
                title: true,
                description: true,
                startTime: true,
                endTime: true,
                location: true,
            },
            limit: 500,
        }),
        db.query.tasks.findMany({
            where: and(
                eq(tasks.workspaceId, row.workspace.id),
                isNull(tasks.deletedAt),
                gte(tasks.dueDate, start),
                lte(tasks.dueDate, end),
            ),
            columns: { id: true, title: true, description: true, dueDate: true },
            limit: 500,
        }),
    ]);
    const stamp = icsDate(new Date());
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//General Portal//Calendar//EN"];
    const push = (s: string) => {
        if (lines.length < 500 + 3) lines.push(s);
    };
    let count = 0;
    for (const e of eventRows) {
        if (count >= 500) break;
        count += 1;
        push("BEGIN:VEVENT");
        push(`UID:${e.id}@general-portal`);
        push(`DTSTAMP:${stamp}`);
        push(`DTSTART:${icsDate(e.startDate)}`);
        if (e.endDate) push(`DTEND:${icsDate(e.endDate)}`);
        push(`SUMMARY:${icsEscape(e.title)}`);
        if (e.description) push(`DESCRIPTION:${icsEscape(e.description)}`);
        if (e.location) push(`LOCATION:${icsEscape(e.location)}`);
        push("END:VEVENT");
    }
    for (const m of meetingRows) {
        if (count >= 500) break;
        count += 1;
        push("BEGIN:VEVENT");
        push(`UID:${m.id}@general-portal`);
        push(`DTSTAMP:${stamp}`);
        push(`DTSTART:${icsDate(m.startTime)}`);
        if (m.endTime) push(`DTEND:${icsDate(m.endTime)}`);
        push(`SUMMARY:${icsEscape(m.title)}`);
        if (m.description) push(`DESCRIPTION:${icsEscape(m.description)}`);
        if (m.location) push(`LOCATION:${icsEscape(m.location)}`);
        push("END:VEVENT");
    }
    for (const ta of taskRows) {
        if (count >= 500) break;
        if (!ta.dueDate) continue;
        count += 1;
        push("BEGIN:VTODO");
        push(`UID:${ta.id}@general-portal`);
        push(`DTSTAMP:${stamp}`);
        push(`DUE:${icsDate(ta.dueDate)}`);
        push(`SUMMARY:${icsEscape(ta.title)}`);
        if (ta.description) push(`DESCRIPTION:${icsEscape(ta.description)}`);
        push("END:VTODO");
    }
    lines.push("END:VCALENDAR");
    return new Response(lines.join("\r\n"), {
        status: 200,
        headers: { "Content-Type": "text/calendar; charset=utf-8" },
    });
}

export async function GET(request: NextRequest) {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return error("Missing token", 401);
    const hash = sha256Hex(token);
    const slugs = listPortalSlugs();
    for (let i = 0; i < slugs.length; i += CHUNK_SIZE) {
        const chunk = slugs.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(
            chunk.map(async (slug) => {
                try {
                    return await resolvePortal(slug, hash);
                } catch {
                    return null;
                }
            }),
        );
        const found = results.find((result) => result !== null);
        if (found) return found;
    }
    return error("Unauthorized", 401);
}
