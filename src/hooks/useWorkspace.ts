"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "./usePortal";

export interface WorkspaceInfo {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    slug: string;
    settings: Record<string, boolean>;
}

export function useWorkspace() {
    const portal = usePortal();
    return useQuery<WorkspaceInfo>({
        queryKey: [portal, "workspace"],
        queryFn: () => fetchJson<WorkspaceInfo>("/api/workspace"),
        enabled: portal !== "",
    });
}
