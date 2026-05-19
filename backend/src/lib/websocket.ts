import { Hono } from "hono";
import { WebSocketServer, WebSocket } from "ws";
import type { ServerType } from "@hono/node-server";
import { decode } from "@auth/core/jwt";
import { env } from "./env.js";

type UserSession = {
  userId: string;
  displayName: string;
  ws: WebSocket;
};

const rooms = new Map<string, Map<string, UserSession>>();

export function setupWebSocket(server: ServerType) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url || "/", "http://localhost");
    if (url.pathname !== "/ws") return void socket.destroy();

    const token = url.searchParams.get("token");
    if (!token) return void socket.destroy();

    try {
      const decoded: any = await decode({ token, secret: env.AUTH_SECRET });
      const payload = decoded as any;
      const userId: string = payload.id || payload.sub || "";
      const workspaceId: string = payload.workspaceId || "ws-default";
      const displayName: string = payload.name || userId;

      wss.handleUpgrade(request, socket, head, (ws) => {
        (ws as any).userId = userId;
        (ws as any).workspaceId = workspaceId;
        (ws as any).alive = true;

        ws.on("pong", () => {
          (ws as any).alive = true;
        });

        if (!rooms.has(workspaceId)) rooms.set(workspaceId, new Map());
        rooms.get(workspaceId)!.set(userId, { userId, displayName, ws });

        broadcastPresence(workspaceId);

        ws.on("close", () => {
          const room = rooms.get(workspaceId);
          if (room) {
            room.delete(userId);
            if (room.size === 0) rooms.delete(workspaceId);
            else broadcastPresence(workspaceId);
          }
        });

        ws.send(JSON.stringify({ type: "connected", userId }));
      });
    } catch {
      socket.destroy();
    }
  });

  const interval = setInterval(() => {
    for (const clients of rooms.values()) {
      for (const [, session] of clients) {
        if (!(session.ws as any).alive) {
          session.ws.terminate();
          continue;
        }
        (session.ws as any).alive = false;
        session.ws.ping();
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
  for (const [, session] of clients) {
    if (session.ws.readyState === WebSocket.OPEN) session.ws.send(data);
  }
}

function broadcastPresence(workspaceId: string) {
  const room = rooms.get(workspaceId);
  if (!room) return;
  const online = Array.from(room.keys());
  const data = JSON.stringify({ type: "presence", online });
  for (const [, session] of room) {
    if (session.ws.readyState === WebSocket.OPEN) session.ws.send(data);
  }
}

export function getOnlineUsers(workspaceId: string): string[] {
  const room = rooms.get(workspaceId);
  if (!room) return [];
  return Array.from(room.keys());
}

export const presenceRoute = new Hono();

presenceRoute.get("/presence", (c) => {
  const workspaceId = c.get("workspaceId");
  return c.json({ online: getOnlineUsers(workspaceId) });
});
