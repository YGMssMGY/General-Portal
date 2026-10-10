import path from "node:path";
import { test as setup, expect } from "@playwright/test";

const authFile = path.join(__dirname, ".auth", "user.json");

setup("Password Sign-In Establishes A Reusable Session", async ({ page, context, baseURL }) => {
    const email = process.env.SMOKE_EMAIL ?? "";
    const password = process.env.SMOKE_PASSWORD ?? "";
    if (!email || !password) {
        throw new Error("Set SMOKE_EMAIL and SMOKE_PASSWORD to a seeded administrator.");
    }
    const portal = process.env.E2E_PORTAL ?? "developers";
    const host = new URL(baseURL ?? "http://localhost:3000").hostname;
    await context.addCookies([{ name: "portal", value: portal, domain: host, path: "/" }]);
    const response = await page.request.post("/api/auth/password/login", {
        data: { email, password },
    });
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { success?: boolean };
    expect(body.success).toBe(true);
    await page.goto(`/${portal}/dashboard`);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await context.storageState({ path: authFile });
});
