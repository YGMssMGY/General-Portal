import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

const publicPaths = ["/", "/login", "/features", "/compare", "/demo", "/use-cases/clubs"];

for (const path of publicPaths) {
    test(`${path} has no critical accessibility violations`, async ({ page }) => {
        await page.goto(path);
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
        const critical = results.violations.filter((v) => v.impact === "critical");
        expect(critical.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    });
}
