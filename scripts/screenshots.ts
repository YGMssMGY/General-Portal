import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page, type Response } from "playwright";

const BASE_URL = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const PORTAL = "developers";
const EMAIL = process.env.SMOKE_EMAIL ?? "";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "";
const OUTPUT_DIR = path.join(process.cwd(), "docs", "screenshots");
const DISABLE_MOTION =
    "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}";

interface Shot {
    slug: string;
    path: string;
    fullPage?: boolean;
}

const SHOTS: Shot[] = [
    { slug: "landing", path: "/" },
    { slug: "login", path: "/login" },
    { slug: "showcase", path: "/showcase" },
    { slug: "features", path: "/features" },
    { slug: "compare", path: "/compare" },
    { slug: "demo", path: "/demo" },
    { slug: "docs", path: "/docs" },
    { slug: "security", path: "/security" },
    { slug: "about", path: "/about" },
    { slug: "use-cases-clubs", path: "/use-cases/clubs" },
    { slug: "use-cases-firms", path: "/use-cases/firms" },
    { slug: "use-cases-agencies", path: "/use-cases/agencies" },
    { slug: "changelog", path: "/changelog" },
    { slug: "roadmap", path: "/roadmap" },
    { slug: "dashboard", path: `/${PORTAL}/dashboard`, fullPage: true },
    { slug: "tasks", path: `/${PORTAL}/tasks`, fullPage: true },
    { slug: "events", path: `/${PORTAL}/events` },
    { slug: "proposals", path: `/${PORTAL}/proposals` },
    { slug: "calendar", path: `/${PORTAL}/calendar` },
    { slug: "messages", path: `/${PORTAL}/messages` },
    { slug: "finance", path: `/${PORTAL}/finance` },
    { slug: "budget", path: `/${PORTAL}/finance?tab=budget` },
    { slug: "purchase-requests", path: `/${PORTAL}/finance?tab=requests` },
    { slug: "volunteers", path: `/${PORTAL}/volunteers` },
    { slug: "members", path: `/${PORTAL}/members` },
    { slug: "files", path: `/${PORTAL}/files` },
    { slug: "meetings", path: `/${PORTAL}/meetings` },
    { slug: "activity", path: `/${PORTAL}/activity` },
    { slug: "subgroups", path: `/${PORTAL}/subgroups` },
    { slug: "settings", path: `/${PORTAL}/settings` },
    { slug: "notifications", path: `/${PORTAL}/notifications` },
    { slug: "search", path: `/${PORTAL}/search` },
    { slug: "my-work", path: `/${PORTAL}/my-work` },
    { slug: "analytics", path: `/${PORTAL}/analytics` },
    { slug: "approvals", path: `/${PORTAL}/approvals` },
    { slug: "badges", path: `/${PORTAL}/badges` },
    { slug: "participation", path: `/${PORTAL}/participation` },
    { slug: "polls", path: `/${PORTAL}/polls` },
    { slug: "goals", path: `/${PORTAL}/goals` },
    { slug: "kudos", path: `/${PORTAL}/kudos` },
    { slug: "dues", path: `/${PORTAL}/dues` },
    { slug: "assets", path: `/${PORTAL}/assets` },
    { slug: "decisions", path: `/${PORTAL}/decisions` },
    { slug: "workflows", path: `/${PORTAL}/workflows` },
    { slug: "attendance", path: `/${PORTAL}/attendance` },
    { slug: "reports", path: `/${PORTAL}/reports` },
    { slug: "trash", path: `/${PORTAL}/trash` },
    { slug: "saved-views", path: `/${PORTAL}/saved-views` },
    { slug: "webhooks", path: `/${PORTAL}/webhooks` },
    { slug: "api-tokens", path: `/${PORTAL}/api-tokens` },
    { slug: "custom-fields", path: `/${PORTAL}/custom-fields` },
    { slug: "admin-health", path: `/${PORTAL}/admin/health` },
    { slug: "admin-audit", path: `/${PORTAL}/admin/audit` },
    { slug: "admin-api-docs", path: `/${PORTAL}/admin/api-docs` },
];

async function capture(page: Page, shot: Shot, index: number): Promise<boolean> {
    const errors: string[] = [];
    const onPageError = (error: Error): void => {
        errors.push(`pageerror: ${error.message}`);
    };
    const onResponse = (response: Response): void => {
        if (response.status() >= 500) errors.push(`http ${response.status()}: ${response.url()}`);
    };
    page.on("pageerror", onPageError);
    page.on("response", onResponse);

    const fileName = `${String(index + 1).padStart(2, "0")}-${shot.slug}.png`;
    let detail = "";
    let ok = true;
    try {
        await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: "domcontentloaded" });
        await page.addStyleTag({ content: DISABLE_MOTION });
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => undefined);
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 10000 });
        await page
            .locator(".animate-pulse")
            .waitFor({ state: "detached", timeout: 5000 })
            .catch(() => undefined);
        await page.screenshot({
            path: path.join(OUTPUT_DIR, fileName),
            animations: "disabled",
            caret: "hide",
            fullPage: shot.fullPage ?? false,
        });
    } catch (error) {
        ok = false;
        detail = error instanceof Error ? error.message : String(error);
    } finally {
        page.off("pageerror", onPageError);
        page.off("response", onResponse);
    }

    if (errors.length > 0) {
        ok = false;
        const joined = errors.join("; ");
        detail = detail ? `${detail}; ${joined}` : joined;
    }
    console.log(`${ok ? "PASS" : "FAIL"} ${fileName}${detail ? ` :: ${detail}` : ""}`);
    return ok;
}

async function main(): Promise<void> {
    if (!EMAIL || !PASSWORD) {
        throw new Error("Set SMOKE_EMAIL and SMOKE_PASSWORD to a seeded administrator.");
    }
    const host = new URL(BASE_URL).hostname;
    await mkdir(OUTPUT_DIR, { recursive: true });

    const browser = await chromium.launch({
        headless: true,
        args: ["--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox"],
    });
    try {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            deviceScaleFactor: 1,
            reducedMotion: "reduce",
            extraHTTPHeaders: { "x-forwarded-for": "198.51.100.250" },
        });
        await context.addCookies([{ name: "portal", value: PORTAL, domain: host, path: "/" }]);
        const page = await context.newPage();

        const response = await page.request.post(`${BASE_URL}/api/auth/password/login`, {
            data: { email: EMAIL, password: PASSWORD },
        });
        if (response.status() !== 200) {
            throw new Error(`Login failed with status ${response.status()}.`);
        }
        const body = (await response.json()) as { success?: boolean };
        if (body.success !== true) throw new Error("Login response did not report success.");

        const cookies = await context.cookies();
        if (!cookies.some((cookie) => cookie.name === "gp_session")) {
            throw new Error("Login did not set the gp_session cookie.");
        }
        if (!cookies.some((cookie) => cookie.name === "portal")) {
            throw new Error("The portal cookie is missing from the browser context.");
        }

        let failures = 0;
        for (const [index, shot] of SHOTS.entries()) {
            if (!(await capture(page, shot, index))) failures += 1;
        }
        if (failures > 0) throw new Error(`${failures} screenshot(s) failed.`);
    } finally {
        await browser.close();
    }
}

void main()
    .catch((error: unknown) => {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    })
    .finally(() => {
        console.log(`Total screenshots: ${SHOTS.length}`);
        console.log(`Output directory: ${OUTPUT_DIR}`);
    });
