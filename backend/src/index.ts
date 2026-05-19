process.stdout.write("\n[server] Starting backend...\n");

const { startApp } = await import("./lib/app.js");

startApp({ port: parseInt(process.env["BACKEND_PORT"] || "30001", 10) });
