"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";
import { usePortal } from "./usePortal";

export interface WorkspaceNavItem {
    path: string;
    label: string;
    icon: string;
    module: string;
}

export interface WorkspaceInfo {
    id: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    slug: string;
    settings: Record<string, boolean>;
    terminology: Record<string, string>;
    features: string[];
    modules: string[];
    nav: WorkspaceNavItem[];
    branding: { logo: string; favicon: string; primary: string };
    radius: number;
    category: string;
    limits: { uploadMb: number; requestsPerMinute: number; auditRetentionDays: number };
}

export function useWorkspace() {
    const portal = usePortal();
    return useQuery<WorkspaceInfo>({
        queryKey: [portal, "workspace"],
        queryFn: () => fetchJson<WorkspaceInfo>("/api/workspace"),
        enabled: portal !== "",
    });
}
