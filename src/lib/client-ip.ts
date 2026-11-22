import { config } from "@/config";

interface HeaderSource {
    headers: { get(name: string): string | null };
}

export function clientIp(request: HeaderSource): string {
    if (config.trustProxy) {
        const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        if (forwarded) return forwarded;
    }
    return request.headers.get("x-real-ip") || "unknown";
}
