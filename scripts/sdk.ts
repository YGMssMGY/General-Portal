import { createPortalClient, PortalApiError } from "../src/lib/sdk/client";

let failures = 0;

function check(name: string, pass: boolean, detail = ""): void {
    if (pass) {
        console.log(`PASS ${name}`);
    } else {
        failures += 1;
        console.log(`FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
    }
}

function describe(e: unknown): string {
    if (e instanceof PortalApiError) return `${e.status} ${e.message}`;
    return e instanceof Error ? e.message : String(e);
}

async function main(): Promise<void> {
    const baseUrl = process.env.GP_URL;
    if (!baseUrl) {
        console.log("SDK verifier");
        console.log(
            "Usage: GP_URL=<base-url> GP_TOKEN=<bearer-token> GP_PORTAL=<slug> pnpm tsx scripts/sdk.ts",
        );
        return;
    }

    const client = createPortalClient({
        baseUrl,
        token: process.env.GP_TOKEN,
        portal: process.env.GP_PORTAL,
    });

    try {
        const workspace = await client.workspace();
        check(
            "workspace returns a portal slug",
            typeof workspace.slug === "string" && workspace.slug.length > 0,
        );
    } catch (e) {
        check("workspace returns a portal slug", false, describe(e));
    }

    try {
        const tasks = await client.tasks.list({ limit: 1 });
        check("tasks.list returns an array", Array.isArray(tasks.data));
        check(
            "tasks.list returns a cursor",
            tasks.cursor === null || typeof tasks.cursor === "string",
        );
    } catch (e) {
        check("tasks.list returns an array", false, describe(e));
    }

    if (failures > 0) process.exit(1);
}

main().catch((e: unknown) => {
    console.error(describe(e));
    process.exit(1);
});
