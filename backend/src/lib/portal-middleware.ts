import { Context, Next } from "hono";
import { getDb } from "./db.js";

const ALLOWED_PORTALS = ["developers", "stuco"];

function parseCookie(c: Context, name: string): string | null {
	const cookieHeader = c.req.header("Cookie");
	if (!cookieHeader) return null;
	for (const part of cookieHeader.split(";")) {
		const trimmed = part.trim();
		if (trimmed.startsWith(name + "=")) {
			return trimmed.slice(name.length + 1);
		}
	}
	return null;
}

function isValidPortal(value: string): value is "developers" | "stuco" {
	return ALLOWED_PORTALS.includes(value);
}

export async function portalMiddleware(c: Context, next: Next) {
	const raw = parseCookie(c, "portal");
	const portal = raw && isValidPortal(raw) ? raw : "developers";

	c.set("portal", portal);
	c.set("db", await getDb(portal));

	await next();
}
