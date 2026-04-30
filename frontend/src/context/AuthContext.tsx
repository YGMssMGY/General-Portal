import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { workspaceApi } from "../api/workspaceApi";
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
  const [user, setUser] = useState<UserProfile>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    workspaceApi
      .getCurrentUser()
      .then((profile) => {
        if (isMounted) {
          setUser(profile);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: () => {
        window.location.href = workspaceApi.getMicrosoftLoginUrl();
      },
      logout: () => {
        window.location.href = "/logout";
      },
      hasPermission: (permission: string) => Boolean(user?.permissions.includes(permission))
    }),
    [user, isLoading]
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
