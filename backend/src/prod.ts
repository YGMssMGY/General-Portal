import { startApp } from "./lib/app.js";

startApp({
  serveFrontend: true,
  port: parseInt(process.env["PROD_PORT"] || "3000", 10),
});
