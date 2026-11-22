import type { NextRequest } from "next/server";
import { and, count, desc, eq, gte } from "drizzle-orm";
import { notificationPrefs, notifications } from "@/db/schema";
import { ApiError, handleRouteError, ok } from "@/lib/api";
import { requireTenant } from "@/lib/tenant";

type Channel = "email" | "in-app";
type Digest = "never" | "daily" | "weekly";

interface PreviewItem {
    id: string;
    title: string;
    createdAt: string;
}

interface PreviewGroup {
    label: string;
    count: number;
    items: PreviewItem[];
}

interface PreviewResponse {
    channel: Channel;
    digest: Digest;
    totalUnread: number;
    groups: PreviewGroup[];
    sampleText: string;
    html: string;
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function toDigest(value: string | undefined): Digest {
    return value === "daily" || value === "weekly" ? value : "never";
}

export async function GET(request: NextRequest) {
    try {
        const t = await requireTenant(request, { module: "notifications" });
        const channel = new URL(request.url).searchParams.get("channel");
        if (channel !== "email" && channel !== "in-app") {
            throw new ApiError("Invalid channel", 400);
        }

        const pref = await t.db.query.notificationPrefs.findFirst({
            where: and(
                eq(notificationPrefs.userId, t.userId),
                eq(notificationPrefs.channel, channel),
            ),
        });
        const digest = toDigest(pref?.digest);
        const since = new Date(Date.now() - (digest === "weekly" ? 7 : 1) * 24 * 3_600_000);
        const scope = [
            eq(notifications.workspaceId, t.workspaceId),
            eq(notifications.userId, t.userId),
            eq(notifications.read, false),
            gte(notifications.createdAt, since),
        ];

        const [grouped, items] = await Promise.all([
            t.db
                .select({ label: notifications.type, n: count() })
                .from(notifications)
                .where(and(...scope))
                .groupBy(notifications.type)
                .orderBy(desc(notifications.type)),
            t.db.query.notifications.findMany({
                where: and(...scope),
                orderBy: [desc(notifications.createdAt), desc(notifications.id)],
                limit: 30,
                columns: { id: true, title: true, type: true, createdAt: true },
            }),
        ]);

        const totalUnread = grouped.reduce((sum, g) => sum + g.n, 0);
        const groups: PreviewGroup[] = grouped.map((g) => ({
            label: g.label,
            count: g.n,
            items: items
                .filter((item) => item.type === g.label)
                .map((item) => ({
                    id: item.id,
                    title: item.title,
                    createdAt: item.createdAt.toISOString(),
                })),
        }));

        const period = digest === "weekly" ? "the last 7 days" : "the last 24 hours";
        const plural = totalUnread === 1 ? "" : "s";
        const sampleText = `Dear member, you have ${totalUnread} unread notification${plural} from ${period} in the ${t.workspace.name} workspace. Please sign in to review them.`;
        const html = [
            "<p>Dear member,</p>",
            `<p>You have <strong>${escapeHtml(String(totalUnread))}</strong> unread notification${plural} from ${escapeHtml(period)} in ${escapeHtml(t.workspace.name)}.</p>`,
            ...groups.map(
                (g) =>
                    `<p><strong>${escapeHtml(g.label)}</strong>: ${escapeHtml(String(g.count))}</p><ul>${g.items
                        .slice(0, 5)
                        .map((item) => `<li>${escapeHtml(item.title)}</li>`)
                        .join("")}</ul>`,
            ),
            "<p>Please sign in to review them.</p>",
        ].join("");

        const data: PreviewResponse = {
            channel,
            digest,
            totalUnread,
            groups,
            sampleText,
            html,
        };
        return ok(data);
    } catch (e) {
        return handleRouteError("GET /api/notification-prefs/preview", e);
    }
}
