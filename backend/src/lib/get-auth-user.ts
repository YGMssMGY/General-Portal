import { Context } from "hono";

export interface AuthUser {
	id: string;
	email: string;
	name: string;
	workspaceId: string;
	role: string;
	permissions: string[];
}

export function getAuthUser(c: Context): AuthUser {
	const user = c.get("user") as Record<string, unknown> | undefined;
	if (!user || !user.id) {
		throw new Error("Authentication required");
	}

	return {
		id: user.id as string,
		email: (user.email as string) || "",
		name: (user.name as string) || (user.email as string) || "Unknown",
		workspaceId: (user.workspaceId as string) || c.get("workspaceId") || "",
		role: (user.role as string) || "member",
		permissions: (user.permissions as string[]) || [],
	};
}

export function requireRole(user: AuthUser, ...roles: string[]): void {
	if (!roles.includes(user.role)) {
		throw new Error(`Access denied. Required role: ${roles.join(" or ")}`);
	}
}

export function requirePermission(user: AuthUser, permission: string): void {
	if (!user.permissions.includes("*") && !user.permissions.includes(permission)) {
		throw new Error(`Access denied. Required permission: ${permission}`);
	}
}
