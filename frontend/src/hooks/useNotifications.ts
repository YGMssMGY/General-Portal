import { useEffect, useState, useCallback } from "react";
import { fetchJson } from "../api/httpClient";
import type { NotificationItem } from "../types";

export function useNotifications() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    const fetchNotifications = useCallback(async () => {
        try {
            const data = await fetchJson<NotificationItem[]>("/notifications");
            setNotifications(data);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const poll = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(poll);
    }, [fetchNotifications]);

    const markRead = useCallback(async (id: string) => {
        await fetchJson(`/notifications/${id}/read`, { method: "PATCH" });
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    }, []);

    const markAllRead = useCallback(async () => {
        await fetchJson("/notifications/read-all", { method: "PATCH" });
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }, []);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return { unreadCount, notifications, markRead, markAllRead, refresh: fetchNotifications };
}
