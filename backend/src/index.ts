import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { authHandler } from "@hono/auth-js";
import { env } from "./lib/env.js";
import { authConfig } from "./lib/auth-config.js";
import { errorHandler } from "./middleware/error.js";
import { requireWorkspace } from "./middleware/auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
dotenv.config({ path: resolve(root, ".env.local") });
dotenv.config({ path: resolve(root, ".env") });

const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
  }),
);

app.use(authConfig);

import healthRoute from "./routes/health.js";
import authRoute from "./routes/auth.js";

app.use("/api/auth/*", authHandler());
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

app.route("/api", healthRoute);
app.route("/api", authRoute);
app.route("/api", docsRoute);

app.use("/api/dashboard", requireWorkspace);
app.use("/api/tasks", requireWorkspace);
app.use("/api/proposals", requireWorkspace);
app.use("/api/events", requireWorkspace);
app.use("/api/volunteers", requireWorkspace);
app.use("/api/finance", requireWorkspace);
app.use("/api/messages", requireWorkspace);
app.use("/api/files", requireWorkspace);
app.use("/api/members", requireWorkspace);
app.use("/api/activity", requireWorkspace);
app.use("/api/search", requireWorkspace);
app.use("/api/settings", requireWorkspace);

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

app.onError(errorHandler);

serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(
      `[backend] Hono server running on http://localhost:${info.port}`,
    );
  },
);

export default app;
