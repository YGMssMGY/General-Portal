import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");

dotenv.config({ path: resolve(root, ".env.local") });
dotenv.config({ path: resolve(root, ".env") });

const dbUrl = process.env["DATABASE_URL"]?.startsWith("postgres")
  ? process.env["DATABASE_URL"]
  : "file:./dev.db";
process.env["DATABASE_URL"] = dbUrl;

const { serve } = await import("@hono/node-server");
const { Hono } = await import("hono");
const { cors } = await import("hono/cors");
const { authHandler } = await import("@hono/auth-js");
const { env } = await import("./lib/env.js");
const { authConfig } = await import("./lib/auth-config.js");
const { errorHandler } = await import("./middleware/error.js");
const { requireWorkspace } = await import("./middleware/auth.js");

const app = new Hono();
app.use("*", cors({ origin: env.FRONTEND_ORIGIN, credentials: true }));
app.use(authConfig);
app.use("/api/auth/*", authHandler());

const [
  { default: healthRoute },
  { default: authRoute },
  { default: dashboardRoute },
  { default: tasksRoute },
  { default: proposalsRoute },
  { default: eventsRoute },
  { default: volunteersRoute },
  { default: financeRoute },
  { default: messagesRoute },
  { default: filesRoute },
  { default: membersRoute },
  { default: activityRoute },
  { default: searchRoute },
  { default: settingsRoute },
  { default: publicRoute },
  { default: docsRoute },
] = await Promise.all([
  import("./routes/health.js"),
  import("./routes/auth.js"),
  import("./routes/dashboard.js"),
  import("./routes/tasks.js"),
  import("./routes/proposals.js"),
  import("./routes/events.js"),
  import("./routes/volunteers.js"),
  import("./routes/finance.js"),
  import("./routes/messages.js"),
  import("./routes/files.js"),
  import("./routes/members.js"),
  import("./routes/activity.js"),
  import("./routes/search.js"),
  import("./routes/settings.js"),
  import("./routes/public.js"),
  import("./routes/docs.js"),
]);

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

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[backend] Hono server running on http://localhost:${info.port}`);
});

export default app;
