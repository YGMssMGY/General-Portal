import { lookup as dnsLookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";

export interface SafeFetchResult {
    ok: boolean;
    status: number;
    headers: Record<string, string>;
    text: string;
    finalUrl: string;
    blocked: boolean;
}

export interface SafeFetchOptions {
    method?: "GET" | "HEAD" | "POST";
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    maxBytes?: number;
    maxRedirects?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 3;
const USER_AGENT = "General-Portal/1.0 LinkFetch";

function normalizeIp(raw: string): string {
    const lower = raw.toLowerCase();
    if (!lower.startsWith("::ffff:")) return lower;
    const rest = lower.slice(7);
    if (rest.includes(".")) return rest;
    const groups = rest.split(":");
    if (groups.length === 2) {
        const high = Number.parseInt(groups[0], 16);
        const low = Number.parseInt(groups[1], 16);
        if (!Number.isNaN(high) && !Number.isNaN(low)) {
            return `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`;
        }
    }
    return lower;
}

function isBlockedV4(ip: string): boolean {
    const parts = ip.split(".");
    if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return true;
    const [a, b, c] = parts.map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0 && c === 0) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
    if (a >= 224) return true;
    return false;
}

function isBlockedV6(ip: string): boolean {
    if (ip === "::" || ip === "::1") return true;
    if (ip === "0:0:0:0:0:0:0:0" || ip === "0:0:0:0:0:0:0:1") return true;
    if (/^fe[89ab]/.test(ip)) return true;
    if (/^f[cd]/.test(ip)) return true;
    if (/^ff/.test(ip)) return true;
    return false;
}

export function isBlockedIp(raw: string): boolean {
    const normalized = normalizeIp(raw);
    const family = isIP(normalized);
    if (family === 4) return isBlockedV4(normalized);
    if (family === 6) {
        const embedded = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(normalized);
        if (embedded && isBlockedV4(embedded[1])) return true;
        return isBlockedV6(normalized);
    }
    return true;
}

interface HopResponse {
    status: number;
    headers: Record<string, string>;
    location: string | null;
    text: string;
}

function requestHop(
    target: URL,
    ip: string,
    method: "GET" | "HEAD" | "POST",
    headers: Record<string, string> | undefined,
    body: string | undefined,
    timeoutMs: number,
    maxBytes: number,
): Promise<HopResponse | null> {
    return new Promise((resolve) => {
        const transport = target.protocol === "https:" ? https : http;
        const hostname = target.hostname.replace(/^\[|\]$/g, "");
        const family = isIP(ip) === 6 ? 6 : 4;
        let settled = false;
        const finish = (value: HopResponse | null) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };
        const requestHeaders: Record<string, string> = {
            Accept: "*/*",
            ...headers,
            Host: target.host,
            "User-Agent": USER_AGENT,
        };

        const req = transport.request(
            {
                protocol: target.protocol,
                hostname,
                port: target.port ? Number(target.port) : undefined,
                method,
                path: `${target.pathname}${target.search}`,
                headers: requestHeaders,
                lookup: (_hostname, _options, cb) => cb(null, ip, family),
                servername: hostname,
                signal: AbortSignal.timeout(timeoutMs),
            },
            (res) => {
                const headers: Record<string, string> = {};
                for (const [name, value] of Object.entries(res.headers)) {
                    if (typeof value === "string") headers[name] = value;
                    else if (Array.isArray(value)) headers[name] = value.join(", ");
                }
                const status = res.statusCode ?? 0;
                const location =
                    typeof res.headers.location === "string" ? res.headers.location : null;
                if (status >= 300 && status < 400 && location) {
                    res.resume();
                    finish({ status, headers, location, text: "" });
                    return;
                }
                const chunks: Buffer[] = [];
                let received = 0;
                res.on("data", (chunk: Buffer) => {
                    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                    received += buffer.length;
                    if (received > maxBytes) {
                        res.destroy();
                        finish(null);
                        return;
                    }
                    chunks.push(buffer);
                });
                res.on("end", () =>
                    finish({
                        status,
                        headers,
                        location: null,
                        text: Buffer.concat(chunks).toString("utf8"),
                    }),
                );
                res.on("error", () => finish(null));
                res.on("aborted", () => finish(null));
            },
        );
        req.on("error", () => finish(null));
        req.end(body);
    });
}

async function safeAddresses(target: URL): Promise<string[] | null> {
    const hostname = target.hostname.replace(/^\[|\]$/g, "");
    let addresses: string[];
    if (isIP(hostname) !== 0) {
        addresses = [hostname];
    } else {
        try {
            const resolved = await dnsLookup(target.hostname, { all: true });
            addresses = resolved.map((r) => r.address);
        } catch {
            return null;
        }
    }
    if (addresses.length === 0 || addresses.some(isBlockedIp)) return null;
    return addresses;
}

export async function isUrlSafe(url: string): Promise<boolean> {
    let target: URL;
    try {
        target = new URL(url);
    } catch {
        return false;
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") return false;
    if (target.username || target.password) return false;
    return (await safeAddresses(target)) !== null;
}

export async function fetchSafe(
    url: string,
    opts: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
    const method = opts.method ?? "GET";
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
    const maxRedirects = opts.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    const fail = (finalUrl: string, blocked = false): SafeFetchResult => ({
        ok: false,
        status: 0,
        headers: {},
        text: "",
        finalUrl,
        blocked,
    });

    let current = url;
    for (let hop = 0; hop <= maxRedirects; hop += 1) {
        let target: URL;
        try {
            target = new URL(current);
        } catch {
            return fail(current);
        }
        if (target.protocol !== "http:" && target.protocol !== "https:") {
            return fail(current, true);
        }
        if (target.username || target.password) return fail(current, true);

        const addresses = await safeAddresses(target);
        if (!addresses) return fail(current, true);

        let hopResponse: HopResponse | null = null;
        try {
            hopResponse = await requestHop(
                target,
                addresses[0],
                method,
                opts.headers,
                opts.body,
                timeoutMs,
                maxBytes,
            );
        } catch {
            return fail(current);
        }
        if (!hopResponse) return fail(current);

        if (hopResponse.location && hopResponse.status >= 300 && hopResponse.status < 400) {
            if (hop === maxRedirects) return fail(current, true);
            try {
                current = new URL(hopResponse.location, target).toString();
            } catch {
                return fail(current);
            }
            continue;
        }

        return {
            ok: hopResponse.status >= 200 && hopResponse.status < 400,
            status: hopResponse.status,
            headers: hopResponse.headers,
            text: hopResponse.text,
            finalUrl: current,
            blocked: false,
        };
    }
    return fail(current);
}
