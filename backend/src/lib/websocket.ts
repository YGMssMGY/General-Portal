import { WebSocketServer, WebSocket } from "ws";
import type { ServerType } from "@hono/node-server";
import { verify } from "hono/jwt";
import { env } from "./env.js";

const rooms = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: ServerType) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/ws") return void socket.destroy();

    const token = url.searchParams.get("token");
    if (!token) return void socket.destroy();

    try {
      const payload: any = await verify(token, env.AUTH_SECRET, "HS256");
      const userId: string = payload.id || payload.sub || "";
      const workspaceId: string = payload.workspaceId || "ws-default";

      wss.handleUpgrade(request, socket, head, (ws) => {
        (ws as any).userId = userId;
        (ws as any).workspaceId = workspaceId;
        (ws as any).alive = true;

        ws.on("pong", () => {
          (ws as any).alive = true;
        });

        if (!rooms.has(workspaceId)) rooms.set(workspaceId, new Set());
        rooms.get(workspaceId)!.add(ws);

        ws.on("close", () => {
          rooms.get(workspaceId)?.delete(ws);
          if (rooms.get(workspaceId)?.size === 0) rooms.delete(workspaceId);
        });

        ws.send(JSON.stringify({ type: "connected", userId }));
      });
    } catch {
      socket.destroy();
    }
  });

  const interval = setInterval(() => {
    for (const clients of rooms.values()) {
      for (const ws of clients) {
        if (!(ws as any).alive) {
          ws.terminate();
          continue;
        }
        (ws as any).alive = false;
        ws.ping();
      }
    }
  }, 30_000);

  wss.on("close", () => {
    clearInterval(interval);
    rooms.clear();
  });
}

export function broadcast(workspaceId: string, event: object) {
  const clients = rooms.get(workspaceId);
  if (!clients) return;
  const data = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}
