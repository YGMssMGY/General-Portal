import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useDemoAuth, DemoAuthProvider } from "./DemoAuthContext";
import { useRealAuth, RealAuthProvider } from "./RealAuthContext";
import type { UserProfile, UserRole } from "../types";

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  role: UserRole | null;
}

const AuthCtx = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const USE_MSW = import.meta.env.VITE_USE_MSW === "true";

function DemoBridge({ children }: { children: ReactNode }) {
  const demo = useDemoAuth();
  const value = useMemo<AuthState>(
    () => ({
      user: demo.user,
      isAuthenticated: demo.isAuthenticated,
      isLoading: demo.isLoading,
      error: null,
      login: async () => {
        window.location.href = "/admin";
      },
      logout: async () => {
        window.location.href = "/";
      },
      hasPermission: demo.hasPermission,
      role: demo.currentRole,
    }),
    [demo.user, demo.isAuthenticated, demo.isLoading, demo.hasPermission, demo.currentRole],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

function RealBridge({ children }: { children: ReactNode }) {
  const real = useRealAuth();
  const value = useMemo<AuthState>(
    () => ({
      user: real.user,
      isAuthenticated: real.isAuthenticated,
      isLoading: real.isLoading,
      error: real.error,
      login: real.login,
      logout: real.logout,
      hasPermission: (permission: string) => {
        if (!real.user?.permissions) return false;
        return real.user.permissions.includes(permission);
      },
      role: real.user?.role ?? null,
    }),
    [real.user, real.isAuthenticated, real.isLoading, real.error, real.login, real.logout],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (USE_MSW) {
    return (
      <DemoAuthProvider>
        <DemoBridge>{children}</DemoBridge>
      </DemoAuthProvider>
    );
  }
  return (
    <RealAuthProvider>
      <RealBridge>{children}</RealBridge>
    </RealAuthProvider>
  );
}
