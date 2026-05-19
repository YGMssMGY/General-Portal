import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWebSocket } from "./useWebSocket";

vi.mock("@hono/auth-js/react", () => ({
	useSession: () => ({ data: null, status: "unauthenticated" }),
}));

describe("useWebSocket", () => {
	it("exports a function", () => {
		expect(typeof useWebSocket).toBe("function");
	});

	it("returns isConnected initially false", () => {
		const { result } = renderHook(() => useWebSocket());
		expect(result.current.isConnected).toBe(false);
	});

	it("does not attempt connection without session", () => {
		const wsSpy = vi.spyOn(globalThis, "WebSocket").mockImplementation(() => ({}) as WebSocket);
		renderHook(() => useWebSocket());
		expect(wsSpy).not.toHaveBeenCalled();
		wsSpy.mockRestore();
	});
});
