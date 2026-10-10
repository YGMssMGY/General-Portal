import { eq } from "drizzle-orm";
import type { PortalDb } from "@/db/client";
import { memberships, notifications } from "@/db/schema";

export function extractMentions(text: string): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const re = /@([\p{L}\p{N}._-]+)/gu;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const name = m[1].toLowerCase();
        if (!seen.has(name)) {
            seen.add(name);
            out.push(name);
        }
        if (out.length >= 20) break;
    }
    return out;
}

export async function notifyMentioned(
    db: PortalDb,
    opts: {
        workspaceId: string;
        entityType: string;
        entityId: string;
        text: string;
        senderId: string;
        link?: string;
    },
): Promise<void> {
    const mentions = extractMentions(opts.text);
    if (mentions.length === 0) return;
    const rows = await db.query.memberships.findMany({
        where: eq(memberships.workspaceId, opts.workspaceId),
        with: { user: true },
    });
    const targets = new Map<string, { id: string; name: string | null }>();
    for (const row of rows) {
        const u = row.user;
        if (!u || u.id === opts.senderId || targets.has(u.id)) continue;
        const name = (u.name ?? "").toLowerCase();
        const email = u.email.toLowerCase();
        const prefix = email.split("@")[0];
        const hit = mentions.some(
            (n) =>
                (name !== "" && (n === name || name.startsWith(n))) ||
                n === email ||
                n === prefix ||
                prefix.startsWith(n),
        );
        if (hit) targets.set(u.id, { id: u.id, name: u.name });
    }
    if (targets.size === 0) return;
    const snippet = opts.text.length > 200 ? `${opts.text.slice(0, 200)}…` : opts.text;
    await db.insert(notifications).values(
        [...targets.values()].map((u) => ({
            workspaceId: opts.workspaceId,
            userId: u.id,
            title: "You were mentioned",
            body: snippet,
            type: "mention",
            link: opts.link ?? null,
        })),
    );
}
