import { ok } from "@/lib/api";
import { config } from "@/config";
import { listPortalSlugs } from "@/db/client";

export async function GET() {
    return ok({
        status: "ok",
        tokenConfigured: Boolean(config.opsToken),
        secretConfigured: config.opsSecret.length > 0,
        ipAllowlistConfigured: config.opsAllowedIps.length > 0,
        portals: listPortalSlugs().length,
    });
}
