import { startApp } from "./lib/app.js";

startApp({ port: parseInt(process.env["BACKEND_PORT"] || "30001", 10) });
