import { test, expect } from "@playwright/test";

const PORTAL = process.env.E2E_PORTAL ?? "developers";

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

test("Password Sign-In With The Seeded Administrator Reaches The Dashboard", async ({ page }) => {
    const { email, password } = credentials();
    await page.goto("/");
    const host = new URL(page.url()).hostname;
    await page.context().clearCookies();
    await page.context().addCookies([{ name: "portal", value: PORTAL, domain: host, path: "/" }]);
    const response = await page.request.post("/api/auth/password/login", {
        data: { email, password },
    });
    expect(response.status()).toBe(200);
    await page.goto(`/${PORTAL}/dashboard`);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("Creating A Task Shows It In The Task List", async ({ page }) => {
    const title = uniqueName("E2E Task");
    await page.goto(`/${PORTAL}/tasks`);
    await page.getByRole("button", { name: "New Task" }).click();
    await page.getByPlaceholder("New Task").fill(title);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await expect(page.getByText(title)).toBeVisible();
});

test("A Created Proposal Can Be Approved", async ({ page }) => {
    const title = uniqueName("E2E Proposal");
    await page.goto(`/${PORTAL}/proposals`);
    await page.getByRole("button", { name: "New Proposal" }).click();
    await page.getByPlaceholder("New Proposal").fill(title);
    await page.getByPlaceholder("Justification").fill("End-to-end verification proposal.");
    await page.getByRole("button", { name: "Submit", exact: true }).click();
    await expect(page.getByText(title)).toBeVisible();
    await page.getByText(title, { exact: true }).click();
    const card = page
        .locator("div")
        .filter({ has: page.getByText(title, { exact: true }) })
        .filter({ has: page.getByRole("button", { name: "Approve" }) })
        .last();
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(card.getByRole("button", { name: "Approve" })).toHaveCount(0);
    await expect(page.getByText(title, { exact: true })).toBeVisible();
});

test("An Uploaded File Downloads Back Intact", async ({ page }) => {
    const fileName = `e2e-${Date.now().toString(36)}.txt`;
    await page.goto(`/${PORTAL}/files`);
    await page
        .locator('input[type="file"]')
        .setInputFiles({ name: fileName, mimeType: "text/plain", buffer: Buffer.from("x") });
    await expect(page.getByText(fileName)).toBeVisible();
    const row = page
        .locator("div")
        .filter({ has: page.getByText(fileName, { exact: true }) })
        .filter({ has: page.locator('a[href^="/api/files/download/"]') })
        .last();
    const href = await row.locator('a[href^="/api/files/download/"]').getAttribute("href");
    if (!href) throw new Error("The download link did not render for the uploaded file.");
    const download = await page.request.get(href);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-type"] ?? "").toContain("application/octet-stream");
    expect(download.headers()["content-disposition"] ?? "").toContain("attachment");
    expect((await download.body()).length).toBe(1);
});

test("Disabling A Module Hides Its Navigation Item", async ({ page }) => {
    const current = (await (await page.request.get("/api/settings")).json()) as {
        success: boolean;
        data: { settings: Record<string, boolean> };
    };
    const original = current.data.settings;
    const disabled = { ...original, tasks: false };
    const tasksLink = page.locator(`a[href="/${PORTAL}/tasks"]`);
    try {
        const update = await page.request.put("/api/settings", { data: { settings: disabled } });
        expect(update.ok()).toBeTruthy();
        await page.goto(`/${PORTAL}/dashboard`);
        await expect(tasksLink).toHaveCount(0);
    } finally {
        await page.request.put("/api/settings", { data: { settings: original } });
    }
    await page.goto(`/${PORTAL}/dashboard`);
    await expect(tasksLink).toHaveCount(1);
});

test("Switching The Locale To Chinese Translates The Navigation", async ({ page }) => {
    await page.goto(`/${PORTAL}/dashboard`);
    const host = new URL(page.url()).hostname;
    await page
        .context()
        .addCookies([{ name: "NEXT_LOCALE", value: "zh-CN", domain: host, path: "/" }]);
    try {
        await page.goto(`/${PORTAL}/dashboard`);
        await expect(page.getByText("仪表板").first()).toBeVisible();
    } finally {
        await page
            .context()
            .addCookies([{ name: "NEXT_LOCALE", value: "en-US", domain: host, path: "/" }]);
    }
});
