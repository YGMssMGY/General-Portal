"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

export interface AuthUser {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    role: string;
    permissions: string[];
    portal: string;
    locale: string;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

const AuthSessionContext = createContext<{ user: AuthUser | null; status: AuthStatus }>({
    user: null,
    status: "loading",
});

async function fetchMe(): Promise<AuthUser | null> {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error("Sign-in is unavailable right now");
    const json = (await res.json()) as { success: boolean; data?: AuthUser };
    return json.success && json.data ? json.data : null;
}

export function AuthSessionProvider({ children }: { children: ReactNode }) {
    const { data, isLoading } = useQuery({
        queryKey: ["auth", "me"],
        queryFn: fetchMe,
        staleTime: 5 * 60 * 1000,
        retry: false,
        refetchOnWindowFocus: false,
    });
    const user = data ?? null;
    const status: AuthStatus = isLoading ? "loading" : user ? "authenticated" : "unauthenticated";
    return (
        <AuthSessionContext.Provider value={{ user, status }}>
            {children}
        </AuthSessionContext.Provider>
    );
}

export function useAuthSession(): { user: AuthUser | null; status: AuthStatus } {
    return useContext(AuthSessionContext);
}
