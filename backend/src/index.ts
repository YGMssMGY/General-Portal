const t0 = Date.now();
process.stdout.write(`[${Date.now() - t0}ms] [server] Starting backend...\n`);

const { startApp } = await import("./lib/app.js");

process.stdout.write(`[${Date.now() - t0}ms] [server] App factory loaded, calling startApp...\n`);

startApp({ port: parseInt(process.env["BACKEND_PORT"] || "30001", 10) });
