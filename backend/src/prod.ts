import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { cors } from "hono/cors";
import { authHandler } from "@hono/auth-js";
import { env } from "./lib/env.js";
import { authConfig } from "./lib/auth-config.js";
import { errorHandler } from "./middleware/error.js";
import { requireWorkspace } from "./middleware/auth.js";

const app = new Hono();

app.use("*", cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
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
app.use("/api/modules/*", requireWorkspace);
app.use("/api/workspace/*", requireWorkspace);

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
app.route("/api", adminRoute);

app.use("/*", serveStatic({ root: "../frontend/dist" }));

app.get("*", async (c) => {
  const { readFileSync } = await import("fs");
  const { resolve, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const indexPath = resolve(__dirname, "../../frontend/dist/index.html");
  return c.html(readFileSync(indexPath, "utf-8"));
});

app.onError(errorHandler);

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(
    `[general-portal] Production server on http://localhost:${info.port}`,
  );
});
