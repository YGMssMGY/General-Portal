import { config } from "@/config";

export function siteUrl(): string {
    return config.baseUrl.replace(/\/+$/, "");
}

export function publicRoutes(): string[] {
    return [
        "/",
        "/showcase",
        "/login",
        "/features",
        "/compare",
        "/docs",
        "/changelog",
        "/roadmap",
        "/security",
        "/about",
        "/demo",
    ];
}

export function safeJsonLd(value: unknown): string {
    return JSON.stringify(value).replace(/</g, "\\u003c");
}
