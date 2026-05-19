import { useEffect, useRef, useCallback, useState } from "react";
import { useSession } from "@hono/auth-js/react";

type MessageCallback = (payload: unknown) => void;

const listeners = new Map<string, Set<MessageCallback>>();

export function subscribe(eventType: string, callback: MessageCallback) {
  if (!listeners.has(eventType)) {
    listeners.set(eventType, new Set());
  }
  listeners.get(eventType)!.add(callback);
  return () => {
    listeners.get(eventType)?.delete(callback);
  };
}

function dispatch(eventType: string, payload: unknown) {
  listeners.get(eventType)?.forEach((cb) => cb(payload));
}

function getWsUrl(): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws`;
}

export function useWebSocket() {
  const { data: session } = useSession();
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);
  const tokenRef = useRef<string>("");
  const [isConnected, setIsConnected] = useState(false);

  const token = (session as any)?.token as string | undefined;
  if (token) tokenRef.current = token;

  const connect = useCallback(() => {
    const t = tokenRef.current;
    if (!t) return;

    wsRef.current?.close();
    const ws = new WebSocket(getWsUrl(), [t]);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type) {
          dispatch(msg.type, msg.notification ?? msg.payload ?? msg);
        }
      } catch {
        /* ignore non-JSON */
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (!mountedRef.current) return;
      const delay = Math.min(1000 * 2 ** retriesRef.current, 30000);
      retriesRef.current++;
      timerRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (tokenRef.current) connect();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      clearTimeout(timerRef.current);
    };
  }, [connect, session]);

  return { isConnected };
}
