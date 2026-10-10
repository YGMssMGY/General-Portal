import { and, eq } from "drizzle-orm";
import type { PortalDb } from "@/db/client";
import { customFieldDefs } from "@/db/schema";

export async function validateCustomFields(
    db: PortalDb,
    workspaceId: string,
    entityType: string,
    metadata: Record<string, unknown> | undefined,
): Promise<string[]> {
    const defs = await db.query.customFieldDefs.findMany({
        where: and(
            eq(customFieldDefs.workspaceId, workspaceId),
            eq(customFieldDefs.entityType, entityType),
        ),
    });
    const errors: string[] = [];
    const values = metadata ?? {};
    for (const def of defs) {
        const value = values[def.key];
        if (value === undefined || value === null || value === "") {
            if (def.required) errors.push(`${def.key}: required`);
            continue;
        }
        switch (def.fieldType) {
            case "text":
                if (typeof value !== "string") errors.push(`${def.key}: expected text`);
                break;
            case "number":
                if (typeof value !== "number" || Number.isNaN(value))
                    errors.push(`${def.key}: expected number`);
                break;
            case "date":
                if (typeof value !== "string" || Number.isNaN(new Date(value).getTime()))
                    errors.push(`${def.key}: expected date`);
                break;
            case "boolean":
                if (typeof value !== "boolean") errors.push(`${def.key}: expected boolean`);
                break;
            case "select":
                if (typeof value !== "string" || !def.options.includes(value))
                    errors.push(`${def.key}: invalid option`);
                break;
            default:
                errors.push(`${def.key}: unknown field type`);
                break;
        }
    }
    for (const key of Object.keys(values)) {
        if (!defs.some((d) => d.key === key)) errors.push(`${key}: unknown field`);
    }
    return errors;
}
