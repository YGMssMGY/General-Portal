import { createHmac, timingSafeEqual } from "node:crypto";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { config } from "@/config";
import { getDb, isKnownPortal, normalizeSlug } from "@/db/client";
import { savedViews, workspaces } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const ENTITY_ROUTES: Record<string, string> = {
    task: "tasks",
    event: "events",
    proposal: "proposals",
    message: "messages",
    finance: "finance",
    volunteer: "volunteers",
    meeting: "meetings",
    member: "members",
};

interface TokenData {
    viewId: string;
    workspaceId: string;
    version: number;
}

function verifyToken(token: string): TokenData | null {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const payload = parts[0];
    const signature = parts[1];
    if (!payload || !signature) return null;
    const raw = Buffer.from(payload, "base64url").toString("utf8");
    const expected = createHmac("sha256", config.authSecret).update(raw).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const fields = raw.split("|");
    if (fields.length !== 5) return null;
    const viewId = fields[0];
    const workspaceId = fields[1];
    const exp = Number(fields[3]);
    const version = Number(fields[4]);
    if (!viewId || !workspaceId || !Number.isSafeInteger(exp) || !Number.isSafeInteger(version)) {
        return null;
    }
    if (exp <= Math.floor(Date.now() / 1000)) return null;
    return { viewId, workspaceId, version };
}

async function resolveView(portal: string, token: string) {
    const slug = normalizeSlug(portal);
    if (!slug || !isKnownPortal(slug)) return null;
    const data = verifyToken(token);
    if (!data) return null;
    const db = getDb(slug);
    const workspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
    });
    if (!workspace || workspace.id !== data.workspaceId) return null;
    const view = await db.query.savedViews.findFirst({
        where: and(eq(savedViews.id, data.viewId), eq(savedViews.workspaceId, data.workspaceId)),
    });
    if (!view || view.shareVersion !== data.version) return null;
    return view;
}

export default async function SharedViewPage({
    params,
}: {
    params: Promise<{ portal: string; token: string }>;
}) {
    const t = await getTranslations("sharedView");
    const te = await getTranslations("errors");
    const { portal, token } = await params;
    const view = await resolveView(portal, token);

    if (!view) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t("invalidLink")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
                        {te("forbidden")}
                    </p>
                </CardContent>
            </Card>
        );
    }

    const route = ENTITY_ROUTES[view.entityType] ?? "members";
    const backHref = `/${portal}/${route}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
                <h1
                    style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        margin: 0,
                        color: "var(--color-text)",
                    }}
                >
                    {view.name}
                </h1>
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: 0 }}>
                    {view.entityType}
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>{t("filters")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <pre
                        style={{
                            margin: 0,
                            fontFamily: "monospace",
                            fontSize: "13px",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            color: "var(--color-text)",
                        }}
                    >
                        {JSON.stringify(view.filters, null, 2)}
                    </pre>
                </CardContent>
            </Card>
            <div>
                <Link
                    href={backHref}
                    style={{
                        fontSize: "14px",
                        color: "var(--color-primary)",
                        textDecoration: "none",
                    }}
                >
                    {t("backToList")}
                </Link>
            </div>
        </div>
    );
}
