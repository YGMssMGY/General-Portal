"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "./usePortal";

export interface PresenceUser {
    userId: string;
    name: string | null;
    image: string | null;
    lastSeenAt: string;
}

export function usePresence() {
    const portal = usePortal();
    return useQuery<{ online: PresenceUser[] }>({
        queryKey: [portal, "presence"],
        queryFn: () => fetchJson<{ online: PresenceUser[] }>("/api/presence"),
        refetchInterval: 15_000,
        staleTime: 10_000,
        enabled: portal !== "",
    });
}
