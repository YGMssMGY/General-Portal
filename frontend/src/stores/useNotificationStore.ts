import { create } from "zustand";

export interface ToastItem {
    id: string;
    message: string;
    type: "success" | "error" | "info";
    duration?: number;
}

interface NotificationState {
    toasts: ToastItem[];
    addToast: (toast: Omit<ToastItem, "id">) => void;
    removeToast: (id: string) => void;
    clearToasts: () => void;
}

let toastCounter = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
    toasts: [],

    addToast: (toast) => {
        const id = `toast-${++toastCounter}`;
        const item: ToastItem = { ...toast, id };
        set((s) => ({ toasts: [...s.toasts, item] }));

        const ms = toast.duration ?? 4000;
        if (ms > 0) {
            setTimeout(() => {
                set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
            }, ms);
        }
    },

    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    clearToasts: () => set({ toasts: [] }),
}));
