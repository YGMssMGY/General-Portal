const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
    const method = (options?.method ?? "GET").toUpperCase();
    const retryable = method === "GET" || method === "HEAD";
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let response: Response;
        try {
            response = await fetch(url, { ...options, signal: controller.signal });
        } catch (err) {
            clearTimeout(timer);
            if (err instanceof DOMException && err.name === "AbortError") {
                throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
            }
            if (err instanceof TypeError && retryable && attempt < MAX_RETRIES) {
                lastError = new Error(`Network error fetching ${url}: ${err.message}`);
                await sleep(Math.min(1000 * 2 ** attempt, 8000));
                continue;
            }
            throw err instanceof Error ? err : new Error(String(err));
        }
        clearTimeout(timer);

        if (response.status === 401) {
            if (typeof window !== "undefined") {
                // Full-page redirect on auth loss: clears stale client state. Not SPA navigation.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = "/login";
            }
            throw new Error("Unauthorized");
        }

        if (
            retryable &&
            attempt < MAX_RETRIES &&
            (response.status === 429 || response.status >= 500)
        ) {
            await sleep(Math.min(1000 * 2 ** attempt, 8000));
            continue;
        }

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Request failed (${response.status}): ${body}`);
        }

        const json = await response.json();
        if (json && typeof json === "object" && json.success === true && "data" in json) {
            return json.data as T;
        }
        return json as T;
    }

    throw lastError ?? new Error(`Failed to fetch ${url}`);
}

export interface PageResult<T> {
    items: T[];
    nextCursor: string | null;
}

export async function fetchPage<T>(url: string, options?: RequestInit): Promise<PageResult<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (response.status === 401) {
            if (typeof window !== "undefined") {
                // Full-page redirect on auth loss: clears stale client state. Not SPA navigation.
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = "/login";
            }
            throw new Error("Unauthorized");
        }
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Request failed (${response.status}): ${body}`);
        }
        const json = await response.json();
        const items =
            json && typeof json === "object" && json.success === true && "data" in json
                ? (json.data as T[])
                : (json as T[]);
        return {
            items: Array.isArray(items) ? items : [],
            nextCursor: response.headers.get("X-Next-Cursor") || null,
        };
    } finally {
        clearTimeout(timer);
    }
}
