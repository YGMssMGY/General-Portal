import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import { compress } from "hono/compress";
import { authHandler } from "@hono/auth-js";
import { serveStatic } from "@hono/node-server/serve-static";
import cron from "node-cron";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { env } from "./env.js";
import { authConfig } from "./auth-config.js";
import { errorHandler } from "../middleware/error.js";
import { requireWorkspace } from "../middleware/auth.js";
import { apiLimiter, authLimiter } from "../middleware/rate-limit.js";
import { portalMiddleware } from "./portal-middleware.js";
import { setupWebSocket, presenceRoute } from "./websocket.js";
import { runNudges } from "../workers/nudges.js";

import healthRoute from "../routes/health.js";
import authRoute from "../routes/auth.js";
import dashboardRoute from "../routes/dashboard.js";
import tasksRoute from "../routes/tasks.js";
import proposalsRoute from "../routes/proposals.js";
import eventsRoute from "../routes/events.js";
import volunteersRoute from "../routes/volunteers.js";
import financeRoute from "../routes/finance.js";
import messagesRoute from "../routes/messages.js";
import filesRoute from "../routes/files.js";
import membersRoute from "../routes/members.js";
import activityRoute from "../routes/activity.js";
import searchRoute from "../routes/search.js";
import settingsRoute from "../routes/settings.js";
import publicRoute from "../routes/public.js";
import docsRoute from "../routes/docs.js";
import adminRoute from "../routes/admin.js";
import notificationRoute from "../routes/notifications.js";
import auditRoute from "../routes/audit.js";
import gamificationRoute from "../routes/gamification.js";
import kudosRoute from "../routes/kudos.js";
import budgetRoute from "../routes/budget.js";
import meetingsRoute from "../routes/meetings.js";
import archiveRoute from "../routes/archive.js";
import publicApiRoute from "../routes/public-api.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface CreateAppOptions {
	serveFrontend?: boolean;
}

export function createApp(opts: CreateAppOptions = {}) {
	const t0 = Date.now();
	process.stdout.write(`[${Date.now() - t0}ms] [app] Creating Hono app...\n`);
	const app = new Hono();

	app.use("*", cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
	app.use("*", secureHeaders());
	app.use("*", compress());
	app.use("*", portalMiddleware);
	app.use("/api/*", apiLimiter);
	app.use("/api/auth/*", authLimiter);
	app.use(authConfig);
	app.use("/api/auth/*", authHandler());

	app.route("/api", healthRoute);
	app.route("/api", authRoute);
	app.route("/api", docsRoute);

	app.use("/api/dashboard", requireWorkspace);
	app.use("/api/tasks", requireWorkspace);
	app.use("/api/proposals", requireWorkspace);
	app.use("/api/events", requireWorkspace);
	app.use("/api/volunteers", requireWorkspace);
	app.use("/api/finance", requireWorkspace);
	app.use("/api/messages/*", requireWorkspace);
	app.use("/api/files", requireWorkspace);
	app.use("/api/members", requireWorkspace);
	app.use("/api/activity", requireWorkspace);
	app.use("/api/search", requireWorkspace);
	app.use("/api/settings", requireWorkspace);
	app.use("/api/roles/*", requireWorkspace);
	app.use("/api/notifications", requireWorkspace);
	app.use("/api/audit", requireWorkspace);
	app.use("/api/modules/*", requireWorkspace);
	app.use("/api/workspace/*", requireWorkspace);
	app.use("/api/gamification", requireWorkspace);
	app.use("/api/kudos", requireWorkspace);
	app.use("/api/presence", requireWorkspace);
	app.use("/api/budget", requireWorkspace);
	app.use("/api/meetings", requireWorkspace);
	app.use("/api/archive", requireWorkspace);

	app.route("/api", presenceRoute);
	app.route("/api", dashboardRoute);
	app.route("/api", tasksRoute);
	app.route("/api", proposalsRoute);
	app.route("/api", eventsRoute);
	app.route("/api", volunteersRoute);
	app.route("/api", financeRoute);
	app.route("/api", messagesRoute);
	app.route("/api", filesRoute);
	app.route("/api", membersRoute);
	app.route("/api", activityRoute);
	app.route("/api", searchRoute);
	app.route("/api", settingsRoute);
	app.route("/api", publicRoute);
	app.route("/api", notificationRoute);
	app.route("/api", auditRoute);
	app.route("/api", gamificationRoute);
	app.route("/api", kudosRoute);
	app.route("/api", budgetRoute);
	app.route("/api", meetingsRoute);
	app.route("/api", archiveRoute);
	if (env.API_KEY) app.route("/api", publicApiRoute);
	app.route("/api", adminRoute);

	if (opts.serveFrontend) {
		const frontendDist = resolve(__dirname, "../../../frontend/dist");
		app.use("/*", serveStatic({ root: frontendDist }));
		app.get("*", (c) => {
			return c.html(readFileSync(resolve(frontendDist, "index.html"), "utf-8"));
		});
	}

	app.onError(errorHandler);

	return app;
}

export interface StartOptions extends CreateAppOptions {
	port?: number;
}

export function startApp(opts: StartOptions = {}) {
	const app = createApp(opts);
	const port = opts.port ?? (opts.serveFrontend ? env.PROD_PORT : env.PORT);

	cron.schedule("0 * * * *", () => {
		runNudges().catch((err) => console.error("[cron] nudge error:", err));
	});

	const server = serve({ fetch: app.fetch, port }, (info) => {
		process.stdout.write(`[server] Running on http://localhost:${info.port}\n`);
	});
	setupWebSocket(server);

	return { app, server };
}
