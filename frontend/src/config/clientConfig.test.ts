import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("getClientConfig", () => {
  it("returns developers config by default", async () => {
    vi.stubEnv("VITE_CLIENT_NAME", undefined);
    const { getClientConfig } = await import("./clientConfig");
    expect(getClientConfig().displayName).toBe("Developers' Club");
  });

  it("returns developers config for VITE_CLIENT_NAME=developers", async () => {
    vi.stubEnv("VITE_CLIENT_NAME", "developers");
    const { getClientConfig } = await import("./clientConfig");
    expect(getClientConfig().shortName).toBe("DC");
  });

  it("returns stuco config for VITE_CLIENT_NAME=stuco", async () => {
    vi.stubEnv("VITE_CLIENT_NAME", "stuco");
    const { getClientConfig } = await import("./clientConfig");
    expect(getClientConfig().shortName).toBe("SC");
  });
});
