const FETCH_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchJson<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(1000 * 2 ** attempt, 8000);
          await sleep(delay);
          continue;
        }
        const body = await response.text();
        throw new Error(`Request failed (${response.status}): ${body}`);
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
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS}ms: ${url}`);
      }
      if (err instanceof TypeError) {
        throw new Error(`Network error fetching ${url}: ${err.message}`);
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}
