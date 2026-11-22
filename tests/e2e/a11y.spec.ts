import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

const PORTAL = process.env.E2E_PORTAL ?? "developers";
const publicPaths = ["/", "/login", "/features", "/compare", "/demo", "/use-cases/clubs"];

async function expectNoSeriousViolations(page: Page, label: string): Promise<void> {
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
    const serious = results.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(
        serious.map((violation) => `${violation.id}: ${violation.help}`),
        label,
    ).toEqual([]);
}

for (const path of publicPaths) {
    test(`${path} has no serious accessibility violations`, async ({ page }) => {
        await page.goto(path);
        await expectNoSeriousViolations(page, path);
    });
}

test.describe("authenticated portal pages", () => {
    async function signIn(page: Page, baseURL: string | undefined): Promise<void> {
        const email = process.env.SMOKE_EMAIL ?? "";
        const password = process.env.SMOKE_PASSWORD ?? "";
        if (!email || !password) {
            throw new Error("Set SMOKE_EMAIL and SMOKE_PASSWORD to a seeded administrator.");
        }
        const host = new URL(baseURL ?? "http://localhost:3000").hostname;
        await page
            .context()
            .addCookies([{ name: "portal", value: PORTAL, domain: host, path: "/" }]);
        const response = await page.request.post("/api/auth/password/login", {
            data: { email, password },
        });
        expect(response.status()).toBe(200);
    }

    for (const path of ["/dashboard", "/tasks"]) {
        test(`${PORTAL}${path} has no serious accessibility violations`, async ({
            page,
            baseURL,
        }) => {
            await signIn(page, baseURL);
            await page.goto(`/${PORTAL}${path}`);
            await expect(page.locator("h1").first()).toBeVisible();
            await expectNoSeriousViolations(page, path);
        });
    }
});
