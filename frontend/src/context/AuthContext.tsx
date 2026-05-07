import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useDemoAuth } from "./DemoAuthContext";
import type { UserProfile } from "../types";

interface AuthContextValue {
  user?: UserProfile;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const demo = useDemoAuth();

  const value = useMemo<AuthContextValue>(
    () => ({
      user: demo.user,
      isAuthenticated: demo.isAuthenticated,
      isLoading: demo.isLoading,
      login: () => {
        window.location.href = "/admin";
      },
      logout: () => {
        window.location.href = "/";
      },
      hasPermission: demo.hasPermission,
    }),
    [demo.user, demo.isAuthenticated, demo.isLoading, demo.hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
