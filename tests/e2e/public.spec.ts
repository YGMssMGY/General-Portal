import { test, expect } from "@playwright/test";

test("Landing Page Lists Both Seeded Portals", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "General Portal" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Developers Club/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Student Council/ })).toBeVisible();
});

test("Login Page Shows A Heading And The Configured Providers", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /Sign in to/ })).toBeVisible();
    const providerLinks = page.locator('a[href^="/api/auth/login/"]');
    const passwordInput = page.locator('input[type="password"]');
    const emptyState = page.getByText("No sign-in methods are configured.");
    await expect(providerLinks.first().or(passwordInput.first()).or(emptyState)).toBeVisible();
});
