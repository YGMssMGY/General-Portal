import { Hono } from "hono";

const route = new Hono();

route.get("/health", (c) => {
	return c.json({
		status: "ok",
		timestamp: new Date().toISOString(),
		version: "0.1.0",
	});
});

export default route;
