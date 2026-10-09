export function usePortal(): string {
    if (typeof window === "undefined") return "";
    return document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1] ?? "";
}
