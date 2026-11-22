"use client";

import { useCallback } from "react";
import { useWorkspace } from "./useWorkspace";

export function useTerm() {
    const { data: workspace } = useWorkspace();
    return useCallback((key: string) => workspace?.terminology?.[key] ?? key, [workspace]);
}
