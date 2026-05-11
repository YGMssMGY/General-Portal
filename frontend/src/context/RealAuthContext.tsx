import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { workspaceApi } from "../api/workspaceApi";
import type { UserProfile } from "../types";

interface RealAuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const RealAuthContext = createContext<RealAuthState | null>(null);

export function RealAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const profile = await workspaceApi.getCurrentUser();
      setUser(profile);
      setError(null);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 401) {
        setUser(null);
        setError(null);
      } else {
        setError(e instanceof Error ? e.message : "Failed to fetch user");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(
    async (username: string, password: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/auth/dev-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          credentials: "include",
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || data.message || "Login failed");
        }
        await fetchUser();
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Login failed";
        setError(message);
        setIsLoading(false);
        throw e;
      }
    },
    [fetchUser],
  );

  const logout = useCallback(async () => {
    setUser(null);
    setError(null);
    window.location.href = "/";
  }, []);

  return (
    <RealAuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, error, login, logout }}
    >
      {children}
    </RealAuthContext.Provider>
  );
}

export function useRealAuth() {
  const ctx = useContext(RealAuthContext);
  if (!ctx) throw new Error("useRealAuth must be used within RealAuthProvider");
  return ctx;
}
