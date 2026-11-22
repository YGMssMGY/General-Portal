import { createHmac } from "node:crypto";
import { test, expect, type APIRequestContext } from "@playwright/test";

const token =
    process.env.OPS_ADMIN_TOKEN ?? process.env.OPS_API_TOKEN ?? "local-ops-token-for-verification";
const headers = { Authorization: `Bearer ${token}`, "X-Forwarded-Proto": "https" };

function scopedReadToken(): string {
    const secret = process.env.OPS_SECRET || process.env.AUTH_SECRET || "";
    const payload = Buffer.from(
        JSON.stringify({
            sub: "e2e-readonly",
            scopes: ["ops:read"],
            exp: Math.floor(Date.now() / 1000) + 3600,
        }),
    ).toString("base64url");
    const signature = createHmac("sha256", secret).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

async function run(request: APIRequestContext, body: unknown) {
    return request.post("/api/ops/run", { headers, data: body });
}

test("Operator discovery is public and lists capabilities", async ({ request }) => {
    const res = await request.get("/api/ops");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { data: { commands: Array<{ id: string }> } };
    expect(body.data.commands.length).toBeGreaterThan(20);
    expect(body.data.commands.some((c) => c.id === "site.list")).toBeTruthy();
});

test("Operator API rejects requests without a token", async ({ request }) => {
    const res = await request.post("/api/ops/run", {
        headers: { "X-Forwarded-Proto": "https" },
        data: { action: "site.list", params: {} },
    });
    expect(res.status()).toBe(401);
});

test("Operator API fails closed on plain HTTP in production", async ({ request }) => {
    const res = await request.post("/api/ops/run", {
        headers: { Authorization: `Bearer ${token}` },
        data: { action: "site.list", params: {} },
    });
    const production = process.env.CI === "true" || process.env.NODE_ENV === "production";
    if (production) expect([403, 401]).toContain(res.status());
    else expect([200, 403, 401]).toContain(res.status());
});

test("Destructive actions require a typed confirmation", async ({ request }) => {
    const first = await run(request, { action: "user.revoke-all", params: { slug: "developers" } });
    expect(first.status()).toBe(409);
    const preview = (await first.json()) as { confirmationToken: string };
    expect(preview.confirmationToken).toBeTruthy();

    const mismatch = await run(request, {
        action: "user.revoke-all",
        params: { slug: "developers" },
        confirmationToken: preview.confirmationToken,
        typedValue: "wrong-slug",
    });
    expect(mismatch.status()).toBe(400);
});

test("Scoped read-only tokens cannot deploy", async ({ request }) => {
    const scopedHeaders = {
        Authorization: `Bearer ${scopedReadToken()}`,
        "X-Forwarded-Proto": "https",
    };
    const read = await request.post("/api/ops/run", {
        headers: scopedHeaders,
        data: { action: "site.list", params: {} },
    });
    expect(read.status()).toBe(200);

    const deploy = await request.post("/api/ops/run", {
        headers: scopedHeaders,
        data: { action: "site.add", params: {} },
    });
    expect(deploy.status()).toBe(403);
});
