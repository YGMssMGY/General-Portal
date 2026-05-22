import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNotifications } from "./useNotifications";

vi.mock("../api/httpClient", () => ({
    fetchJson: vi.fn().mockResolvedValue([]),
}));

describe("useNotifications", () => {
    it("returns unreadCount starting at 0", async () => {
        const { result } = renderHook(() => useNotifications());
        await waitFor(() => {
            expect(result.current.unreadCount).toBe(0);
        });
    });

    it("exports markRead function", () => {
        const { result } = renderHook(() => useNotifications());
        expect(typeof result.current.markRead).toBe("function");
    });

    it("exports markAllRead function", () => {
        const { result } = renderHook(() => useNotifications());
        expect(typeof result.current.markAllRead).toBe("function");
    });

    it("exports refresh function", () => {
        const { result } = renderHook(() => useNotifications());
        expect(typeof result.current.refresh).toBe("function");
    });

    it("returns notifications as an empty array initially", async () => {
        const { result } = renderHook(() => useNotifications());
        await waitFor(() => {
            expect(Array.isArray(result.current.notifications)).toBe(true);
            expect(result.current.notifications).toHaveLength(0);
        });
    });
});
