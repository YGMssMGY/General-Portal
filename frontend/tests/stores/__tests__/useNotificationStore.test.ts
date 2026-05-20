import { describe, it, expect, beforeEach, vi } from "vitest";
import { useNotificationStore } from "../../../src/stores/useNotificationStore";

describe("useNotificationStore", () => {
    beforeEach(() => {
        useNotificationStore.setState({ toasts: [] });
        vi.useFakeTimers();
    });

    it("starts with empty toasts", () => {
        expect(useNotificationStore.getState().toasts).toEqual([]);
    });

    it("addToast adds a toast with auto-generated id", () => {
        useNotificationStore.getState().addToast({ message: "Hello", type: "success" });
        const toasts = useNotificationStore.getState().toasts;
        expect(toasts).toHaveLength(1);
        expect(toasts[0].message).toBe("Hello");
        expect(toasts[0].type).toBe("success");
        expect(toasts[0].id).toBeTruthy();
    });

    it("auto-removes toast after duration", () => {
        useNotificationStore.getState().addToast({ message: "Temp", type: "info", duration: 1000 });
        expect(useNotificationStore.getState().toasts).toHaveLength(1);
        vi.advanceTimersByTime(1000);
        expect(useNotificationStore.getState().toasts).toHaveLength(0);
    });

    it("removeToast removes by id", () => {
        useNotificationStore.getState().addToast({ message: "Remove me", type: "error" });
        const id = useNotificationStore.getState().toasts[0].id;
        useNotificationStore.getState().removeToast(id);
        expect(useNotificationStore.getState().toasts).toHaveLength(0);
    });

    it("clearToasts removes all", () => {
        useNotificationStore.getState().addToast({ message: "One", type: "info" });
        useNotificationStore.getState().addToast({ message: "Two", type: "success" });
        useNotificationStore.getState().clearToasts();
        expect(useNotificationStore.getState().toasts).toHaveLength(0);
    });
});
