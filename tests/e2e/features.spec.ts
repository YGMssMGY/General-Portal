import { test, expect } from "@playwright/test";

const PORTAL = process.env.E2E_PORTAL ?? "developers";

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
    `/api/public/openapi.json`,
    `/api/ops/openapi.json`,
];

test("New feature endpoints return the success envelope", async ({ page }) => {
    for (const endpoint of endpoints) {
        const response = await page.request.get(endpoint);
        expect(response.status(), endpoint).toBeLessThan(500);
        if (endpoint.startsWith("/api/public/") || endpoint.startsWith("/api/ops/")) continue;
        const body = (await response.json()) as { success?: boolean };
        expect(body.success, endpoint).toBe(true);
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
        const onError = (error: Error) => errors.push(error.message);
        page.on("pageerror", onError);
        await page.goto(path);
        await page.waitForLoadState("domcontentloaded");
        await page.waitForTimeout(1500);
        expect(errors, path).toEqual([]);
        page.off("pageerror", onError);
    }
});
