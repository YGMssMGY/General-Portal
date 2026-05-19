import { create } from "zustand";

type ThemeMode = "light" | "dark";
type Portal = "developers" | "stuco" | null;

interface UIState {
  sidebarExpanded: boolean;
  theme: ThemeMode;
  portal: Portal;
  toggleSidebar: () => void;
  setSidebarExpanded: (v: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setPortal: (portal: Portal) => void;
}

function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function getPortalCookie(): Portal {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)portal=([^;]*)/);
  const val = match?.[1];
  if (val === "developers" || val === "stuco") return val;
  return null;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarExpanded: false,
  theme: getStoredTheme(),
  portal: getPortalCookie(),

  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  setSidebarExpanded: (v) => set({ sidebarExpanded: v }),

  setTheme: (theme) => {
    try {
      localStorage.setItem("theme", theme);
    } catch {}
    set({ theme });
  },

  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme", next);
      } catch {}
      return { theme: next };
    }),

  setPortal: (portal) => {
    if (portal) {
      document.cookie = `portal=${portal};path=/;max-age=31536000`;
    } else {
      document.cookie = "portal=;path=/;max-age=0";
    }
    set({ portal });
  },
}));
