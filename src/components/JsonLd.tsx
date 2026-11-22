import { headers } from "next/headers";
import { safeJsonLd } from "@/lib/seo";

export async function JsonLd({ data }: { data: Record<string, unknown> }) {
    const h = await headers();
    const nonce = h.get("x-nonce") ?? undefined;
    return (
        <script type="application/ld+json" nonce={nonce}>
            {safeJsonLd(data)}
        </script>
    );
}
