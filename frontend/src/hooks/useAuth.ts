import { useSession, signIn, signOut } from "@hono/auth-js/react";
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

function toUser(sessionUser: Record<string, unknown> | undefined): UserProfile | null {
	if (!sessionUser) return null;
	return {
		id: (sessionUser.id as string) || "",
		email: (sessionUser.email as string) || "",
		displayName: (sessionUser.name as string) || (sessionUser.email as string) || "",
		avatarUrl: (sessionUser.image as string) || undefined,
		role: (sessionUser.role as UserRole) || "member",
		permissions: (sessionUser.permissions as string[]) || [],
		workspaceName: (sessionUser.workspaceName as string) || "",
	};
}

export function useAuth(): AuthState {
	const { data: session, status } = useSession();
	const user = toUser(session?.user as Record<string, unknown> | undefined);

	return {
		user,
		isAuthenticated: status === "authenticated",
		isLoading: status === "loading",
		error: null,
		login: async (username: string, password: string) => {
			const result = await signIn("credentials", {
				username,
				password,
				redirect: false,
			});
			if (result?.error) {
				throw new Error(
					result.error === "CredentialsSignin" ? "Invalid credentials" : result.error,
				);
			}
		},
		logout: async () => {
			await signOut({ redirect: false });
			window.location.href = "/";
		},
		hasPermission: (permission: string) => {
			if (!user?.permissions) return false;
			return user.permissions.includes(permission);
		},
		role: user?.role ?? null,
	};
}
