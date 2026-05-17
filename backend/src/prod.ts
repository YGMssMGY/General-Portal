import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { authHandler } from "@hono/auth-js";
import { env } from "./lib/env.js";
import { authConfig } from "./lib/auth-config.js";
import { errorHandler } from "./middleware/error.js";
import { requireWorkspace } from "./middleware/auth.js";
import { secureHeaders } from "hono/secure-headers";
import { apiLimiter, authLimiter } from "./middleware/rate-limit.js";
import { setupWebSocket, presenceRoute } from "./lib/websocket.js";
import notificationRoute from "./routes/notifications.js";
import auditRoute from "./routes/audit.js";
import gamificationRoute from "./routes/gamification.js";
import kudosRoute from "./routes/kudos.js";
import budgetRoute from "./routes/budget.js";
import meetingsRoute from "./routes/meetings.js";
import archiveRoute from "./routes/archive.js";
import publicApiRoute from "./routes/public-api.js";
import cron from "node-cron";
import { runNudges } from "./workers/nudges.js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const frontendDist = resolve(__dirname, "../../frontend/dist");

const app = new Hono();

app.use("*", cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use("*", secureHeaders());
app.use("/api/*", apiLimiter);
app.use("/api/auth/*", authLimiter);
app.use(authConfig);
app.use("/api/auth/*", authHandler());

import healthRoute from "./routes/health.js";
import authRoute from "./routes/auth.js";
import dashboardRoute from "./routes/dashboard.js";
import tasksRoute from "./routes/tasks.js";
import proposalsRoute from "./routes/proposals.js";
import eventsRoute from "./routes/events.js";
import volunteersRoute from "./routes/volunteers.js";
import financeRoute from "./routes/finance.js";
import messagesRoute from "./routes/messages.js";
import filesRoute from "./routes/files.js";
import membersRoute from "./routes/members.js";
import activityRoute from "./routes/activity.js";
import searchRoute from "./routes/search.js";
import settingsRoute from "./routes/settings.js";
import publicRoute from "./routes/public.js";
import docsRoute from "./routes/docs.js";
import adminRoute from "./routes/admin.js";

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

app.use("/*", serveStatic({ root: frontendDist }));

app.get("*", (c) => {
  return c.html(readFileSync(resolve(frontendDist, "index.html"), "utf-8"));
});

app.onError(errorHandler);

cron.schedule("0 * * * *", () => {
  runNudges().catch((err) => console.error("[cron] nudge error:", err));
});

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(
    `[general-portal] Production server on http://localhost:${info.port}`,
  );
});
setupWebSocket(server);
