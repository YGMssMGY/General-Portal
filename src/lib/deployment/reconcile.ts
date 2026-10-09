import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { roles, workspaces } from "@/db/schema";
import { logger } from "@/lib/logger";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissions";
import { getDeployment } from "./index";

export async function reconcile(): Promise<void> {
    let createdWorkspaces = 0;
    let createdRoles = 0;
    for (const portal of getDeployment().portals) {
        const db = getDb(portal.slug);
        const found = await db
            .select({ id: workspaces.id })
            .from(workspaces)
            .where(eq(workspaces.slug, portal.slug))
            .limit(1);
        let workspaceId = found[0]?.id;
        if (!workspaceId) {
            const settings: Record<string, boolean> = {};
            for (const m of portal.modules) settings[m] = true;
            const inserted = await db
                .insert(workspaces)
                .values({
                    name: portal.name,
                    slug: portal.slug,
                    description: portal.description,
                    logoUrl: portal.branding.logo,
                    settings,
                })
                .returning({ id: workspaces.id });
            const row = inserted[0];
            if (!row) throw new Error(`Failed to create workspace for portal "${portal.slug}"`);
            workspaceId = row.id;
            createdWorkspaces += 1;
        }
        for (const name of portal.roles) {
            const existing = await db
                .select({ id: roles.id })
                .from(roles)
                .where(and(eq(roles.workspaceId, workspaceId), eq(roles.name, name)))
                .limit(1);
            if (!existing[0]) {
                await db.insert(roles).values({
                    workspaceId,
                    name,
                    permissions: DEFAULT_ROLE_PERMISSIONS[name] ?? [],
                    isSystem: true,
                });
                createdRoles += 1;
            }
        }
    }
    logger.info({ createdWorkspaces, createdRoles }, "deployment reconcile complete");
}
