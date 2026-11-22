import { test, expect } from "@playwright/test";

test("Landing Page Lists Both Seeded Portals", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "General Portal" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Developers Club", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student Council", exact: true })).toBeVisible();
});

test("Login Page Offers A Configured Provider Or A Password Form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Sign in to/ })).toBeVisible();
    const providerLink = page.locator('a[href^="/api/auth/login/"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(providerLink.or(passwordInput)).toBeVisible();
});
