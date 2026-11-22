import { backupActions } from "./actions/backup";
import { jobActions } from "./actions/jobs";
import { migrateActions } from "./actions/migrate";
import { siteActions } from "./actions/site";
import { systemActions } from "./actions/system";
import type { ActionDefinition, ActionDescriptor } from "./types";

const all: ActionDefinition[] = [
    ...siteActions,
    ...migrateActions,
    ...backupActions,
    ...jobActions,
    ...systemActions,
];

const actions = new Map<string, ActionDefinition>();

for (const action of all) {
    if (actions.has(action.id)) throw new Error(`Duplicate action id: ${action.id}`);
    actions.set(action.id, action);
}

export function getAction(id: string): ActionDefinition | undefined {
    return actions.get(id);
}

export function listActions(): ActionDefinition[] {
    return [...actions.values()];
}

export function describeAction(id: string): ActionDescriptor | null {
    const a = actions.get(id);
    if (!a) return null;
    const body = JSON.stringify({ action: a.id, params: {} });
    return {
        id: a.id,
        group: a.group,
        summary: a.summary,
        scopes: a.scopes,
        destructive: a.destructive,
        confirmField: a.confirmField,
        params: { description: a.params.description ?? "" },
        exampleCurl:
            `curl -sS -X POST https://<host>/api/ops/run -H 'Authorization: Bearer <token>' ` +
            `-H 'Content-Type: application/json' -d '${body}'`,
        exampleIrm:
            `irm -Method Post -Uri 'https://<host>/api/ops/run' -Headers @{ Authorization='Bearer <token>' } ` +
            `-ContentType 'application/json' -Body '${body}'`,
    };
}

export function describeAll(): ActionDescriptor[] {
    return [...actions.keys()]
        .map((id) => describeAction(id))
        .filter((a): a is ActionDescriptor => a !== null);
}
