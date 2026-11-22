import { config } from "@/config";

interface HeaderSource {
    headers: { get(name: string): string | null };
}

export function clientIp(request: HeaderSource): string {
    if (config.trustProxy) {
        for (const name of ["cf-connecting-ip", "x-envoy-external-address", "fastly-client-ip"]) {
            const external = request.headers.get(name)?.split(",")[0]?.trim();
            if (external) return external;
        }
        const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
        if (forwarded) return forwarded;
    }
    return request.headers.get("x-real-ip") || "unknown";
}
