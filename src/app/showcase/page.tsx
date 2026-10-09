import { headers } from "next/headers";
import { ShowcaseView, type PublicPortal, type ShowcaseData } from "./ShowcaseView";

export const dynamic = "force-dynamic";

export const metadata = { title: "Showcase | General Portal" };

async function readData<T>(promise: PromiseSettledResult<Response>): Promise<T | null> {
    if (promise.status !== "fulfilled" || !promise.value.ok) return null;
    try {
        const json = (await promise.value.json()) as { success: boolean; data?: T };
        return json.success ? (json.data ?? null) : null;
    } catch {
        return null;
    }
}

export default async function ShowcasePage() {
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("host") ?? "localhost:3000";
    const base = `${proto}://${host}`;

    const [portalsResult, showcaseResult] = await Promise.allSettled([
        fetch(`${base}/api/public/portals`, { cache: "no-store" }),
        fetch(`${base}/api/public/showcase`, { cache: "no-store" }),
    ]);

    const portals = (await readData<PublicPortal[]>(portalsResult)) ?? [];
    const data = await readData<ShowcaseData>(showcaseResult);

    return <ShowcaseView portals={portals} data={data} failed={data === null} />;
}
