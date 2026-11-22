import { test, expect, type Browser, type BrowserContext } from "@playwright/test";

const PORTAL = process.env.E2E_PORTAL ?? "developers";
const OTHER_PORTAL = PORTAL === "developers" ? "stuco" : "developers";
const RATE_LIMIT_IP = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
const BURST_IP = `198.51.101.${Math.floor(Math.random() * 200) + 1}`;

const endpoints = [
    "/api/my-work",
    "/api/analytics?range=30",
    "/api/usage",
    "/api/approvals",
    "/api/badges",
    "/api/presence",
    "/api/admin/permissions",
    "/api/notification-prefs/preview?channel=email",
    "/api/webhooks",
    "/api/saved-views",
    "/api/invitations",
    "/api/comments?entityType=task&entityId=00000000-0000-0000-0000-000000000000",
    "/api/public/openapi.json",
    "/api/ops/openapi.json",
];

function credentials(): { email: string; password: string } {
    const email = process.env.SMOKE_EMAIL ?? "";
    const password = process.env.SMOKE_PASSWORD ?? "";
    if (!email || !password) {
        throw new Error("Set SMOKE_EMAIL and SMOKE_PASSWORD to a seeded administrator.");
    }
    return { email, password };
}

function uniqueName(prefix: string): string {
    return `${prefix} ${Date.now().toString(36)}`;
}

async function loginContext(
    browser: Browser,
    portal: string,
    baseURL: string | undefined,
): Promise<BrowserContext> {
    const { email, password } = credentials();
    const context = await browser.newContext({ baseURL });
    const host = new URL(baseURL ?? "http://localhost:3000").hostname;
    await context.addCookies([{ name: "portal", value: portal, domain: host, path: "/" }]);
    const response = await context.request.post("/api/auth/password/login", {
        headers: { "x-forwarded-for": RATE_LIMIT_IP },
        data: { email, password },
    });
    expect(response.status()).toBe(200);
    return context;
}

test("New feature endpoints return the exact success envelope", async ({ page }) => {
    for (const endpoint of endpoints) {
        const response = await page.request.get(endpoint);
        expect(response.status(), endpoint).toBeLessThan(500);
        const body = (await response.json()) as Record<string, unknown>;
        if (endpoint === "/api/public/openapi.json") {
            expect(body.openapi, endpoint).toBe("3.0.0");
        } else if (endpoint === "/api/ops/openapi.json") {
            expect(body.success, endpoint).toBe(true);
            expect((body.data as { openapi?: string } | undefined)?.openapi).toBe("3.0.3");
        } else {
            expect(body.success, endpoint).toBe(true);
        }
    }
});

test("New feature pages render without runtime errors", async ({ page }) => {
    const paths = [
        `/${PORTAL}/my-work`,
        `/${PORTAL}/analytics`,
        `/${PORTAL}/admin/usage`,
        `/${PORTAL}/admin/import`,
        `/${PORTAL}/approvals`,
        `/${PORTAL}/badges`,
        `/${PORTAL}/notifications/digest-preview`,
        `/${PORTAL}/admin/translations`,
    ];
    for (const path of paths) {
        const errors: string[] = [];
        const onPageError = (error: Error) => errors.push(`pageerror: ${error.message}`);
        const onConsole = (message: { type(): string; text(): string }) => {
            if (
                message.type() === "error" &&
                !/favicon|404 \(Not Found\)|Failed to load resource|eval\(\) is not supported in this environment/i.test(
                    message.text(),
                )
            ) {
                errors.push(`console: ${message.text()}`);
            }
        };
        const onResponse = (response: { status(): number; url(): string }) => {
            if (response.status() >= 500)
                errors.push(`response: ${response.status()} ${response.url()}`);
        };
        page.on("pageerror", onPageError);
        page.on("console", onConsole);
        page.on("response", onResponse);
        await page.goto(path);
        await expect(page.locator("h1").first()).toBeVisible();
        expect(errors, path).toEqual([]);
        page.off("pageerror", onPageError);
        page.off("console", onConsole);
        page.off("response", onResponse);
    }
});

test("A wrong password is rejected with 401", async ({ page }) => {
    const { email } = credentials();
    const response = await page.request.post("/api/auth/password/login", {
        data: { email, password: "definitely-not-the-password" },
    });
    expect(response.status()).toBe(401);
});

test("A cross-origin POST with a session cookie is rejected with 403", async ({ page }) => {
    const response = await page.request.post("/api/tasks", {
        headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
        data: { title: uniqueName("CSRF") },
    });
    expect(response.status()).toBe(403);
});

test("A login burst is rate limited with Retry-After", async ({ page }) => {
    let saw429 = false;
    let retryAfter = 0;
    for (let attempt = 0; attempt < 15; attempt += 1) {
        const response = await page.request.post("/api/auth/password/login", {
            headers: { "x-forwarded-for": BURST_IP },
            data: { email: "rate-limit-probe@example.com", password: "wrong-password" },
        });
        if (response.status() === 429) {
            saw429 = true;
            retryAfter = Number(response.headers()["retry-after"] ?? 0);
            break;
        }
    }
    expect(saw429).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
});

test("SCIM reports unconfigured or unauthenticated access", async ({ page }) => {
    const response = await page.request.get("/api/scim/v2/Users");
    expect([401, 501]).toContain(response.status());
    if (process.env.SCIM_TOKEN) expect(response.status()).toBe(401);
    else expect(response.status()).toBe(501);
});

test("SCIM rejects a wrong bearer token", async ({ page }) => {
    const response = await page.request.get("/api/scim/v2/Users", {
        headers: { Authorization: "Bearer definitely-wrong-scim-token" },
    });
    expect([401, 501]).toContain(response.status());
    if (process.env.SCIM_TOKEN) expect(response.status()).toBe(401);
    else expect(response.status()).toBe(501);
});

test("Link preview blocks a loopback URL", async ({ page }) => {
    const url = new URLSearchParams({ url: "http://127.0.0.1/" }).toString();
    const response = await page.request.get(`/api/link-preview?${url}`);
    expect(response.status()).toBe(400);
});

test("Notification preview rejects an invalid channel", async ({ page }) => {
    const response = await page.request.get("/api/notification-prefs/preview?channel=sms");
    expect(response.status()).toBe(400);
});

test("Data import accepts a small CSV", async ({ page }) => {
    const form = new FormData();
    form.append("entityType", "task");
    form.append(
        "file",
        new Blob(["title,description\nE2E Imported Task,Imported via E2E\n"], {
            type: "text/plain",
        }),
        "e2e-import.csv",
    );
    const response = await page.request.post("/api/data-import", { multipart: form });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { success?: boolean; data?: { inserted?: number } };
    expect(body.success).toBe(true);
    expect(body.data?.inserted ?? 0).toBeGreaterThan(0);
});

test("Saved view share links are created, tamper-proof and revocable", async ({ page }) => {
    const name = uniqueName("E2E View");
    const created = await page.request.post("/api/saved-views", {
        data: { entityType: "task", name, filters: {} },
    });
    expect(created.status()).toBe(201);
    const view = (await created.json()) as { data?: { id?: string } };
    const id = view.data?.id;
    expect(id).toBeTruthy();

    const share = await page.request.get(`/api/saved-views/share?id=${id}`);
    expect(share.status()).toBe(200);
    const shareBody = (await share.json()) as { data?: { url?: string } };
    const shareUrl = shareBody.data?.url;
    if (!shareUrl) throw new Error("The saved view share link was not returned.");

    await page.goto(shareUrl);
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();

    const tamperedUrl = shareUrl.replace(/\.[^.]+$/, `.${"A".repeat(32)}`);
    await page.goto(tamperedUrl);
    await expect(page.getByText("This shared view link is invalid or expired.")).toBeVisible();

    const revoked = await page.request.post("/api/saved-views/share", {
        data: { id, revoke: true },
    });
    expect(revoked.status()).toBe(200);
    await page.goto(shareUrl);
    await expect(page.getByText("This shared view link is invalid or expired.")).toBeVisible();
});

test("Analytics falls back to the default range for invalid input", async ({ page }) => {
    const response = await page.request.get("/api/analytics?range=not-a-number");
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { success?: boolean; data?: { range?: number } };
    expect(body.success).toBe(true);
    expect(body.data?.range).toBe(30);
});

test("A task id cannot be read through another portal's session", async ({
    page,
    browser,
    baseURL,
}) => {
    const created = await page.request.post("/api/tasks", {
        data: { title: uniqueName("Cross Portal Task") },
    });
    expect(created.status()).toBe(201);
    const body = (await created.json()) as { data?: { id?: string } };
    const taskId = body.data?.id;
    expect(taskId).toBeTruthy();

    const context = await loginContext(browser, OTHER_PORTAL, baseURL);
    try {
        const read = await context.request.get(`/api/tasks/${taskId}`);
        expect(read.status()).toBe(404);
    } finally {
        await context.close();
    }
});

test("Member sessions cannot replay webhooks or read finance trends", async ({
    page,
    browser,
    baseURL,
}) => {
    const memberEmail = `e2e-member-${Date.now().toString(36)}@basischina.com`;
    const memberPassword = "MemberPass123!";
    const created = await page.request.post("/api/admin/users", {
        data: { email: memberEmail, name: "E2E Member", role: "member", password: memberPassword },
    });
    expect([200, 201]).toContain(created.status());

    const context = await browser.newContext({ baseURL });
    try {
        const host = new URL(baseURL ?? "http://localhost:3000").hostname;
        await context.addCookies([{ name: "portal", value: PORTAL, domain: host, path: "/" }]);
        const login = await context.request.post("/api/auth/password/login", {
            headers: { "x-forwarded-for": RATE_LIMIT_IP },
            data: { email: memberEmail, password: memberPassword },
        });
        expect(login.status()).toBe(200);

        const replay = await context.request.post(
            "/api/webhooks/00000000-0000-0000-0000-000000000000/replay",
            { data: { event: "test" } },
        );
        expect(replay.status()).toBe(403);

        const trends = await context.request.get("/api/finance/trends");
        expect(trends.status()).toBe(403);
    } finally {
        await context.close();
    }
});
