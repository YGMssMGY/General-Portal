const BASE_URL = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
);
const EMAIL = process.env.SMOKE_EMAIL ?? "";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "";

if (!EMAIL || !PASSWORD) {
    console.error("SMOKE_EMAIL and SMOKE_PASSWORD must be set to a seeded admin user.");
    process.exit(2);
}

const GET_ROUTES = [
    "/api/tasks",
    "/api/events",
    "/api/proposals",
    "/api/finance/summary",
    "/api/budget",
    "/api/volunteers",
    "/api/meetings",
    "/api/members",
    "/api/kudos",
    "/api/messages",
    "/api/files",
    "/api/links",
    "/api/cooperation",
    "/api/purchase-requests",
    "/api/subgroups",
    "/api/showcase",
    "/api/search?q=smoke",
    "/api/calendar",
    "/api/dashboard",
    "/api/activity",
    "/api/audit",
    "/api/notifications",
    "/api/participation",
    "/api/reports",
    "/api/workflows",
    "/api/approvals",
    "/api/attendance",
    "/api/webhooks",
    "/api/api-tokens",
    "/api/saved-views",
    "/api/notification-prefs",
    "/api/trash",
    "/api/custom-fields",
    "/api/settings",
    "/api/me",
    "/api/workspace",
    "/api/my-work",
    "/api/analytics?range=30",
    "/api/usage",
    "/api/badges",
    "/api/presence",
    "/api/finance/trends",
];

interface PortalInfo {
    slug: string;
    name: string;
}

let failures = 0;

function check(name: string, pass: boolean, detail = ""): void {
    if (pass) {
        console.log(`PASS ${name}`);
    } else {
        failures += 1;
        console.log(`FAIL ${name}${detail ? ` :: ${detail}` : ""}`);
    }
}

function isSuccess(body: unknown): body is { success: true; data: unknown } {
    return (
        typeof body === "object" &&
        body !== null &&
        (body as { success?: unknown }).success === true &&
        "data" in body
    );
}

function dataOf(body: unknown): Record<string, unknown> | unknown[] | null {
    if (!isSuccess(body)) return null;
    if (typeof body.data === "object" && body.data !== null)
        return body.data as Record<string, unknown> | unknown[];
    return null;
}

async function readJson(res: Response): Promise<unknown> {
    try {
        return (await res.json()) as unknown;
    } catch {
        return null;
    }
}

function sessionFrom(res: Response): string | null {
    for (const cookie of res.headers.getSetCookie()) {
        const match = /^gp_session=([^;]+)/.exec(cookie);
        if (match?.[1]) return match[1];
    }
    return null;
}

function authed(
    path: string,
    slug: string,
    session: string,
    init?: RequestInit,
): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set("Cookie", `gp_session=${session}; portal=${slug}`);
    return fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
}

async function login(slug: string): Promise<string | null> {
    const res = await fetch(`${BASE_URL}/api/auth/password/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: `portal=${slug}` },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
        redirect: "manual",
    });
    const body = await readJson(res);
    const session = sessionFrom(res);
    check(
        `[${slug}] password login returns 200 with session cookie`,
        res.status === 200 && isSuccess(body) && session !== null,
        `status=${res.status} body=${JSON.stringify(body)?.slice(0, 160)}`,
    );
    return session;
}

async function verifyPortal(portal: PortalInfo, run: string): Promise<string | null> {
    const slug = portal.slug;
    const session = await login(slug);
    if (!session) return null;

    for (const route of GET_ROUTES) {
        const res = await authed(route, slug, session);
        const body = await readJson(res);
        check(
            `[${slug}] GET ${route} returns 200 success envelope`,
            res.status === 200 && isSuccess(body),
            `status=${res.status}`,
        );
    }

    const taskTitle = `Smoke Task ${run}`;
    const taskRes = await authed("/api/tasks", slug, session, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskTitle, description: "Verification task" }),
    });
    const taskBody = dataOf(await readJson(taskRes)) as Record<string, unknown> | null;
    check(
        `[${slug}] POST /api/tasks creates a task`,
        taskRes.status === 201 && typeof taskBody?.id === "string",
        `status=${taskRes.status}`,
    );

    const membersRes = await authed("/api/members", slug, session);
    const members = dataOf(await readJson(membersRes));
    const peer = Array.isArray(members)
        ? (members as Array<{ id?: unknown; email?: unknown }>).find((m) => m.email !== EMAIL)
        : undefined;
    if (typeof peer?.id === "string") {
        const kudosRes = await authed("/api/kudos", slug, session, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ receiverId: peer.id, message: `Smoke kudos ${run}` }),
        });
        check(
            `[${slug}] POST /api/kudos sends kudos to a peer`,
            kudosRes.status === 201 && isSuccess(await readJson(kudosRes)),
            `status=${kudosRes.status}`,
        );
    } else {
        check(`[${slug}] POST /api/kudos sends kudos to a peer`, false, "no peer member found");
    }

    const threadRes = await authed("/api/messages", slug, session, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: `Smoke Thread ${run}`, content: "Verification message" }),
    });
    const thread = dataOf(await readJson(threadRes)) as Record<string, unknown> | null;
    check(
        `[${slug}] POST /api/messages creates a thread`,
        threadRes.status === 201 && typeof thread?.id === "string",
        `status=${threadRes.status}`,
    );

    const proposalRes = await authed("/api/proposals", slug, session, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: `Smoke Proposal ${run}`,
            description: "Verification proposal",
        }),
    });
    const proposal = dataOf(await readJson(proposalRes)) as Record<string, unknown> | null;
    const proposalId = typeof proposal?.id === "string" ? proposal.id : null;
    check(
        `[${slug}] POST /api/proposals creates a pending proposal`,
        proposalRes.status === 201 && proposal?.status === "pending",
        `status=${proposalRes.status}`,
    );
    if (proposalId) {
        const approveRes = await authed(`/api/proposals/${proposalId}/approve`, slug, session, {
            method: "POST",
        });
        const approved = dataOf(await readJson(approveRes)) as Record<string, unknown> | null;
        check(
            `[${slug}] POST /api/proposals/[id]/approve approves it`,
            approveRes.status === 200 && approved?.status === "approved",
            `status=${approveRes.status}`,
        );
    }

    const fileName = `smoke-${run}.txt`;
    const form = new FormData();
    form.append("file", new Blob(["x"], { type: "text/plain" }), fileName);
    const uploadRes = await authed("/api/files", slug, session, { method: "POST", body: form });
    const upload = dataOf(await readJson(uploadRes)) as Record<string, unknown> | null;
    const fileId = typeof upload?.id === "string" ? upload.id : null;
    check(
        `[${slug}] POST /api/files uploads a 1-byte text file`,
        uploadRes.status === 201 && upload?.fileName === fileName,
        `status=${uploadRes.status}`,
    );
    if (fileId) {
        const dl = await authed(`/api/files/download/${fileId}`, slug, session);
        const bytes = dl.status === 200 ? await dl.arrayBuffer() : new ArrayBuffer(0);
        check(
            `[${slug}] GET /api/files/download/[id] returns octet-stream attachment`,
            dl.status === 200 &&
                (dl.headers.get("content-type") ?? "").includes("application/octet-stream") &&
                (dl.headers.get("content-disposition") ?? "").includes("attachment") &&
                bytes.byteLength === 1,
            `status=${dl.status} content-type=${dl.headers.get("content-type")}`,
        );
    }

    const settingsRes = await authed("/api/settings", slug, session);
    const settings = dataOf(await readJson(settingsRes)) as Record<string, unknown> | null;
    if (settings && typeof settings.name === "string") {
        const putRes = await authed("/api/settings", slug, session, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: settings.name,
                description: settings.description ?? null,
                settings: (settings.settings as Record<string, boolean>) ?? {},
            }),
        });
        const echoed = dataOf(await readJson(putRes)) as Record<string, unknown> | null;
        check(
            `[${slug}] PUT /api/settings round-trips as seeded admin (role matrix needs a second user)`,
            putRes.status === 200 && echoed?.name === settings.name,
            `status=${putRes.status}`,
        );
    } else {
        check(`[${slug}] PUT /api/settings round-trips as seeded admin`, false, "no settings");
    }

    const badLimit = await authed("/api/tasks?limit=abc", slug, session);
    check(
        `[${slug}] GET /api/tasks?limit=abc returns 200 without a 500`,
        badLimit.status === 200 && isSuccess(await readJson(badLimit)),
        `status=${badLimit.status}`,
    );

    return session;
}

async function main(): Promise<void> {
    const run = Date.now().toString(36);

    const portalsRes = await fetch(`${BASE_URL}/api/public/portals`, { redirect: "manual" });
    const portalsBody = await readJson(portalsRes);
    const portals =
        isSuccess(portalsBody) && Array.isArray(portalsBody.data)
            ? (portalsBody.data as PortalInfo[])
            : [];
    check(
        "GET /api/public/portals lists seeded portals",
        portalsRes.status === 200 && portals.length > 0,
        `status=${portalsRes.status} count=${portals.length}`,
    );
    if (portals.length === 0) {
        console.log(`${failures} check(s) failed`);
        process.exit(1);
    }

    const sessions = new Map<string, string>();
    for (const portal of portals) {
        if (!portal.slug) {
            check("portal entry has a slug", false, JSON.stringify(portal).slice(0, 120));
            continue;
        }
        const session = await verifyPortal(portal, run);
        if (session) sessions.set(portal.slug, session);
        else check(`[${portal.slug}] portal verification completed`, false, "login failed");
    }

    const first = portals[0];
    const firstSession = sessions.get(first.slug);
    if (firstSession) {
        const other = portals.length > 1 ? portals[1].slug : "no-such-portal";
        const cross = await authed("/api/tasks", other, firstSession);
        await cross.text().catch(() => null);
        check(
            "cross-portal cookie does not leak data (401/404, never 200)",
            cross.status === 401 || cross.status === 404,
            `status=${cross.status}`,
        );

        const wrongPassword = await fetch(`${BASE_URL}/api/auth/password/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Cookie: `portal=${first.slug}` },
            body: JSON.stringify({ email: EMAIL, password: `${PASSWORD}-wrong` }),
            redirect: "manual",
        });
        check(
            "wrong-password login returns 401",
            wrongPassword.status === 401,
            `status=${wrongPassword.status}`,
        );

        const csrf = await authed("/api/tasks", first.slug, firstSession, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
            body: JSON.stringify({ title: `Smoke CSRF ${run}` }),
        });
        check(
            "cross-origin POST with a session cookie returns 403",
            csrf.status === 403,
            `status=${csrf.status}`,
        );

        const ssrf = await authed(
            "/api/link-preview?url=http%3A%2F%2F127.0.0.1%2F",
            first.slug,
            firstSession,
        );
        check("link preview blocks a loopback URL", ssrf.status === 400, `status=${ssrf.status}`);

        const badChannel = await authed(
            "/api/notification-prefs/preview?channel=sms",
            first.slug,
            firstSession,
        );
        check(
            "notification preview rejects an invalid channel",
            badChannel.status === 400,
            `status=${badChannel.status}`,
        );

        const badRange = await authed("/api/analytics?range=abc", first.slug, firstSession);
        const badRangeBody = dataOf(await readJson(badRange)) as Record<string, unknown> | null;
        check(
            "invalid analytics range falls back to 30",
            badRange.status === 200 && badRangeBody?.range === 30,
            `status=${badRange.status}`,
        );
    }

    const scim = await fetch(`${BASE_URL}/api/scim/v2/Users`, { redirect: "manual" });
    check(
        "SCIM is rejected when unconfigured or unauthenticated",
        scim.status === 401 || scim.status === 501,
        `status=${scim.status}`,
    );

    const opsHealth = await fetch(`${BASE_URL}/api/ops/health`, { redirect: "manual" });
    check(
        "GET /api/ops/health returns the success envelope",
        opsHealth.status === 200 && isSuccess(await readJson(opsHealth)),
        `status=${opsHealth.status}`,
    );
    const opsToken = process.env.OPS_API_TOKEN ?? "";
    if (opsToken) {
        const opsRun = await fetch(`${BASE_URL}/api/ops/run`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${opsToken}`,
                "X-Forwarded-Proto": "https",
            },
            body: JSON.stringify({ action: "site.list", params: {} }),
            redirect: "manual",
        });
        check(
            "ops run with a configured token lists sites",
            opsRun.status === 200 && isSuccess(await readJson(opsRun)),
            `status=${opsRun.status}`,
        );
    }

    const anon = await fetch(`${BASE_URL}/api/tasks`, { redirect: "manual" });
    check(
        "GET /api/tasks without a cookie returns 401",
        anon.status === 401,
        `status=${anon.status}`,
    );

    const anonDl = await fetch(
        `${BASE_URL}/api/files/download/00000000-0000-0000-0000-000000000000`,
        { redirect: "manual" },
    );
    check(
        "GET /api/files/download/[id] without a cookie returns 401",
        anonDl.status === 401,
        `status=${anonDl.status}`,
    );

    const home = await fetch(`${BASE_URL}/`, { redirect: "manual" });
    const csp = home.headers.get("content-security-policy") ?? "";
    check(
        "GET / sets a Content-Security-Policy header",
        csp.includes("default-src"),
        csp.slice(0, 80),
    );
    check(
        "GET / sets X-Content-Type-Options nosniff",
        home.headers.get("x-content-type-options") === "nosniff",
        home.headers.get("x-content-type-options") ?? "missing",
    );
    check(
        "GET / sets X-Frame-Options DENY",
        home.headers.get("x-frame-options") === "DENY",
        home.headers.get("x-frame-options") ?? "missing",
    );

    if (failures > 0) {
        console.log(`${failures} check(s) failed`);
        process.exit(1);
    }
    console.log("All smoke checks passed");
}

main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
