import { ok } from "@/lib/api";
import { describeAll } from "@/ops/registry";

export async function GET() {
    const tools = describeAll().map((a) => ({
        name: a.id,
        description: `${a.summary}${a.destructive ? " DESTRUCTIVE — requires typed confirmation." : ""}`,
        inputSchema: a.inputSchema,
        scopes: a.scopes,
        destructive: a.destructive,
        exampleCurl: a.exampleCurl,
        exampleIrm: a.exampleIrm,
    }));
    return ok({ schemaVersion: 1, name: "general-portal-ops", tools });
}
