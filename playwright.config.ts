import { defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/e2e",
    fullyParallel: true,
    workers: 1,
    retries: process.env.CI ? 2 : 0,
    reporter: [["list"]],
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
    },
    webServer: {
        command: "pnpm dev",
        url: "http://localhost:3000/api/health",
        reuseExistingServer: !process.env.CI,
        timeout: 180000,
    },
    projects: [
        { name: "setup", testMatch: /auth\.setup\.ts/ },
        { name: "public", testMatch: /public\.spec\.ts/ },
        { name: "ops", testMatch: /ops\.spec\.ts/ },
        { name: "a11y", testMatch: /a11y\.spec\.ts/ },
        {
            name: "portal",
            testMatch: /portal\.spec\.ts/,
            dependencies: ["setup"],
            use: { storageState: "tests/e2e/.auth/user.json" },
        },
    ],
});
