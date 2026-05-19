import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("getClientConfig", () => {
	it("returns generic config without portal", async () => {
		const { getClientConfig } = await import("./clientConfig");
		expect(getClientConfig().displayName).toBe("General Portal");
		expect(getClientConfig().favicon).toBe("");
	});

	it("returns developers config for developers portal", async () => {
		const { getClientConfig } = await import("./clientConfig");
		expect(getClientConfig("developers").shortName).toBe("DC");
		expect(getClientConfig("developers").favicon).toBe("/developers.png");
	});

	it("returns stuco config for stuco portal", async () => {
		const { getClientConfig } = await import("./clientConfig");
		expect(getClientConfig("stuco").shortName).toBe("SC");
		expect(getClientConfig("stuco").favicon).toBe("/stuco.png");
	});
});
