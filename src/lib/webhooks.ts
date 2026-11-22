import { createHmac } from "node:crypto";
import { fetchSafe, type SafeFetchResult } from "@/lib/ssrf";

export function signWebhookPayload(body: string, secret: string): string {
    return createHmac("sha256", secret).update(body).digest("hex");
}

export function postWebhook(
    url: string,
    body: string,
    secret: string | null,
): Promise<SafeFetchResult> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-Portal-Signature"] = signWebhookPayload(body, secret);
    return fetchSafe(url, { method: "POST", body, headers });
}
