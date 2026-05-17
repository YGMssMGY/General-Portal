import { describe, it, expect } from "vitest";
import { broadcast, setupWebSocket } from "./websocket.js";

describe("WebSocket", () => {
  it("broadcast function exists", () => {
    expect(broadcast).toBeDefined();
    expect(typeof broadcast).toBe("function");
  });

  it("setupWebSocket function exists", () => {
    expect(setupWebSocket).toBeDefined();
    expect(typeof setupWebSocket).toBe("function");
  });
});
