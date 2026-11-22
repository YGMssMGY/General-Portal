import type { z } from "zod";
import { backupActions } from "./actions/backup";
import { jobActions } from "./actions/jobs";
import { migrateActions } from "./actions/migrate";
import { siteActions } from "./actions/site";
import { systemActions } from "./actions/system";
import type { ActionDefinition, ActionDescriptor } from "./types";

type ZodDef = {
    type: string;
    innerType?: z.ZodType;
    shape?: Record<string, z.ZodType>;
    entries?: Record<string, string>;
    options?: z.ZodType[];
    values?: unknown[];
    element?: z.ZodType;
    checks?: Array<{
        def?: { format?: string };
        _zod?: { def?: { check?: string; value?: number; minimum?: number } };
    }>;
};

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

function defOf(schema: z.ZodType): ZodDef {
    return schema.def as ZodDef;
}

function unwrap(schema: z.ZodType): z.ZodType {
    const def = defOf(schema);
    if (
        (def.type === "default" || def.type === "optional" || def.type === "nullable") &&
        def.innerType
    ) {
        return unwrap(def.innerType);
    }
    return schema;
}

function isOptional(schema: z.ZodType): boolean {
    return ["default", "optional", "nullable"].includes(defOf(schema).type);
}

function exampleValue(schema: z.ZodType, depth = 0, name = ""): unknown {
    if (depth > 4) return null;
    const inner = unwrap(schema);
    const def = defOf(inner);
    switch (def.type) {
        case "string": {
            const format = def.checks?.find((c) => c.def?.format)?.def?.format;
            if (format === "email") return "user@example.com";
            if (format === "uuid") return "00000000-0000-0000-0000-000000000000";
            if (name.toLowerCase().includes("slug")) return "example";
            if (name === "file") return "backup.sql";
            return "string";
        }
        case "number":
        case "int":
        case "bigint": {
            const min = def.checks?.find((c) => c._zod?.def?.check === "greater_than")?._zod?.def
                ?.value;
            return Math.max(1, Math.ceil(min ?? 1));
        }
        case "boolean":
            return true;
        case "enum":
            return Object.keys(def.entries ?? {})[0] ?? "value";
        case "literal":
            return def.values?.[0] ?? null;
        case "array": {
            const min = def.checks?.find((c) => c._zod?.def?.check === "min_length")?._zod?.def
                ?.minimum;
            if ((min ?? 0) > 0 && def.element) return [exampleValue(def.element, depth + 1)];
            return [];
        }
        case "record":
            return {};
        case "object":
            return Object.fromEntries(
                Object.entries(def.shape ?? {}).map(([key, value]) => [
                    key,
                    exampleValue(value, depth + 1),
                ]),
            );
        default:
            if (def.options?.[0]) return exampleValue(def.options[0], depth + 1);
            return null;
    }
}

const JSON_TYPE: Record<string, string> = {
    string: "string",
    number: "number",
    int: "integer",
    bigint: "integer",
    boolean: "boolean",
    enum: "string",
    literal: "string",
    array: "array",
    record: "object",
    object: "object",
};

function jsonProperty(schema: z.ZodType, depth = 0, name = ""): Record<string, unknown> {
    const inner = unwrap(schema);
    const def = defOf(inner);
    const out: Record<string, unknown> = {
        type: JSON_TYPE[def.type] ?? "string",
        description: inner.description ?? "",
        example: exampleValue(inner, depth, name),
    };
    if (def.type === "enum") out.enum = Object.keys(def.entries ?? {});
    if (def.type === "object") {
        out.properties = Object.fromEntries(
            Object.entries(def.shape ?? {}).map(([key, value]) => [
                key,
                jsonProperty(value, depth + 1, key),
            ]),
        );
    }
    return out;
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
    const shape = defOf(a.params).shape ?? {};
    const example = Object.fromEntries(
        Object.entries(shape).map(([key, value]) => [key, exampleValue(value, 0, key)]),
    );
    const properties = Object.fromEntries(
        Object.entries(shape).map(([key, value]) => [key, jsonProperty(value, 0, key)]),
    );
    const required = Object.entries(shape)
        .filter(([, value]) => !isOptional(value))
        .map(([key]) => key);
    const body = JSON.stringify({ action: a.id, params: example });
    const headers = `-H 'Authorization: Bearer <token>' -H 'Content-Type: application/json'`;
    const url = "https://<host>/api/ops/run";
    let exampleCurl: string;
    let exampleIrm: string;
    if (a.destructive) {
        const first = JSON.stringify({
            action: a.id,
            params: example,
            idempotencyKey: "op-1",
        });
        const confirm = a.confirmField ? `"typedValue": "<${a.confirmField}>"` : `"yes": true`;
        const second = `{ "action": "${a.id}", "params": ${JSON.stringify(example)}, "idempotencyKey": "op-1", "confirmationToken": "<token from step 1>", ${confirm} }`;
        exampleCurl = [
            `# 1: request a confirmation token (HTTP 409)`,
            `curl -sS -X POST ${url} ${headers} -d '${first}'`,
            `# 2: repeat with the token, the same idempotencyKey and typed confirmation`,
            `curl -sS -X POST ${url} ${headers} -d '${second}'`,
        ].join("\n");
        exampleIrm = [
            `# 1: request a confirmation token (HTTP 409)`,
            `irm -Method Post -Uri '${url}' -Headers @{ Authorization='Bearer <token>' } -ContentType 'application/json' -Body '${first}'`,
            `# 2: repeat with the token, the same idempotencyKey and typed confirmation`,
            `irm -Method Post -Uri '${url}' -Headers @{ Authorization='Bearer <token>' } -ContentType 'application/json' -Body '${second}'`,
        ].join("\n");
    } else {
        exampleCurl = `curl -sS -X POST ${url} ${headers} -d '${body}'`;
        exampleIrm = `irm -Method Post -Uri '${url}' -Headers @{ Authorization='Bearer <token>' } -ContentType 'application/json' -Body '${body}'`;
    }
    return {
        id: a.id,
        group: a.group,
        summary: a.summary,
        scopes: a.scopes,
        destructive: a.destructive,
        confirmField: a.confirmField,
        params: example,
        inputSchema: {
            type: "object",
            properties,
            required,
            additionalProperties: false,
        },
        exampleCurl,
        exampleIrm,
    };
}

export function describeAll(): ActionDescriptor[] {
    return [...actions.keys()]
        .map((id) => describeAction(id))
        .filter((a): a is ActionDescriptor => a !== null);
}
