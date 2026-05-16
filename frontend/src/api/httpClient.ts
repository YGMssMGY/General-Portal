const rawBaseUrl = import.meta.env.VITE_API_URL || "/api";
export const API_BASE_URL = rawBaseUrl.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

function isRetryable(status: number): boolean {
  return status >= 500 || status === 429 || status === 0;
}

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        credentials: "include",
        ...init,
        headers,
      });

      if (!response.ok) {
        const details = await parseError(response);
        if (attempt < maxRetries && isRetryable(response.status)) {
          await delay(1000 * (attempt + 1));
          continue;
        }
        const msg =
          details && typeof details === "object" && "message" in (details as any)
            ? (details as any).message
            : `Request failed (HTTP ${response.status})`;
        throw new ApiError(msg, response.status, details);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (e) {
      if (e instanceof ApiError) throw e;
      if (attempt < maxRetries) {
        await delay(1000 * (attempt + 1));
        continue;
      }
      const msg =
        e instanceof TypeError && e.message.includes("fetch")
          ? "Network error — server may be unavailable"
          : e instanceof Error
            ? e.message
            : "Request failed";
      throw new ApiError(msg, 0, e);
    }
  }

  throw new ApiError("Request failed after retries", 0);
}

export async function fetchPage<T>(path: string, init?: RequestInit): Promise<T[]> {
  const data = await fetchJson<T[] | { content: T[] }>(path, init);
  if (Array.isArray(data)) return data;
  return data.content;
}

export function jsonBody<TBody extends object>(body: TBody): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
