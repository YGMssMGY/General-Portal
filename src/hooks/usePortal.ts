"use client";

import { useSyncExternalStore } from "react";

function readPortalCookie(): string {
    if (typeof document === "undefined") return "";
    return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1]?.trim() ?? "";
}

function subscribe(): () => void {
    return () => {};
}

export function usePortal(): string {
    return useSyncExternalStore(subscribe, readPortalCookie, () => "");
}
