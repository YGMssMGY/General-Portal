import { Context, Next } from "hono";
import { getDb } from "./db.js";

const ALLOWED_PORTALS = ["developers", "stuco"];

export function isValidPortal(value: string): value is "developers" | "stuco" {
  return ALLOWED_PORTALS.includes(value);
}

export async function portalMiddleware(c: Context, next: Next) {
  const cookie = c.req.cookie?.("portal");
  const portal = cookie && isValidPortal(cookie) ? cookie : "developers";

  const db = getDb(portal);

  c.set("portal", portal);
  c.set("db", db);

  await next();
}
