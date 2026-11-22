import { test, expect, type APIRequestContext } from "@playwright/test";

const token = process.env.OPS_API_TOKEN ?? "local-ops-token-for-verification";
const headers = { Authorization: `Bearer ${token}`, "X-Forwarded-Proto": "https" };

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
    expect([403, 401]).toContain(res.status());
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
