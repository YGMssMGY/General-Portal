import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchJson, fetchPage, ApiError } from "./httpClient";

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockResponse(overrides: Partial<Response>): Response {
  const defaults: Response = {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    url: "",
    redirected: false,
    type: "basic",
    body: null,
    bodyUsed: false,
    clone: vi.fn(),
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    text: vi.fn(),
    json: vi.fn(),
    bytes: vi.fn(),
  };
  return { ...defaults, ...overrides };
}

describe("fetchJson", () => {
  it("throws ApiError on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        ok: false,
        status: 404,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ message: "Not found" }),
      }),
    );

    await expect(fetchJson("/test")).rejects.toThrow(ApiError);
  });

  it("throws ApiError with correct status on non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        headers: new Headers({ "content-type": "application/json" }),
        json: () => Promise.resolve({ message: "Bad request" }),
      }),
    );

    let error: unknown;
    try {
      await fetchJson("/test");
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(400);
  });

  it("succeeds on ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "ok" }),
      }),
    );

    const result = await fetchJson("/test");
    expect(result).toEqual({ data: "ok" });
  });

  it("calls fetch with the correct URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );

    await fetchJson("/test-path");
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/test-path",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("returns undefined for 204 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        ok: true,
        status: 204,
        json: () => {
          throw new Error("should not be called");
        },
      }),
    );

    const result = await fetchJson("/test");
    expect(result).toBeUndefined();
  });
});

describe("fetchPage", () => {
  it("handles array response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        ok: true,
        json: () => Promise.resolve([{ id: 1 }, { id: 2 }]),
      }),
    );

    const result = await fetchPage("/items");
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("handles { content: [] } response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        ok: true,
        json: () => Promise.resolve({ content: [{ id: 1 }] }),
      }),
    );

    const result = await fetchPage("/items");
    expect(result).toEqual([{ id: 1 }]);
  });
});

describe("retry logic", () => {
  it("retries on 5xx and succeeds", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 500,
          headers: new Headers({ "content-type": "text/plain" }),
          text: () => Promise.resolve("Server error"),
        }),
      )
      .mockResolvedValueOnce(
        mockResponse({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        }),
      );

    const result = await fetchJson("/test");
    expect(result).toEqual({ success: true });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  }, 10_000);

  it("throws after exhausting retries on 5xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      mockResponse({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "text/plain" }),
        text: () => Promise.resolve("Server error"),
      }),
    );

    await expect(fetchJson("/test")).rejects.toThrow(ApiError);
  }, 10_000);
});
