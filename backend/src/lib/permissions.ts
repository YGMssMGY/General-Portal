export type Role = "admin" | "president" | "officer" | "member";

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
	admin: [
		"task:read",
		"task:write",
		"task:delete",
		"proposal:read",
		"proposal:write",
		"proposal:delete",
		"event:read",
		"event:write",
		"event:delete",
		"volunteer:read",
		"volunteer:write",
		"volunteer:delete",
		"finance:read",
		"finance:write",
		"finance:delete",
		"message:read",
		"message:write",
		"message:delete",
		"file:read",
		"file:write",
		"file:delete",
		"member:read",
		"member:write",
		"member:delete",
		"activity:read",
		"settings:read",
		"settings:write",
	],
	president: [
		"task:read",
		"task:write",
		"proposal:read",
		"proposal:write",
		"event:read",
		"event:write",
		"volunteer:read",
		"volunteer:write",
		"finance:read",
		"message:read",
		"message:write",
		"file:read",
		"member:read",
		"activity:read",
		"settings:read",
	],
	officer: [
		"task:read",
		"task:write",
		"proposal:read",
		"proposal:write",
		"event:read",
		"event:write",
		"volunteer:read",
		"message:read",
		"message:write",
		"file:read",
		"member:read",
		"activity:read",
	],
	member: [
		"task:read",
		"event:read",
		"volunteer:read",
		"message:read",
		"file:read",
		"activity:read",
	],
};

export function getPermissionsForRole(role: string): string[] {
	return ROLE_PERMISSIONS[role.toLowerCase() as Role] || ROLE_PERMISSIONS.member;
}

export function hasPermission(userPermissions: string[], permission: string): boolean {
	return userPermissions.includes("*") || userPermissions.includes(permission);
}

export function hasAnyPermission(userPermissions: string[], permissions: string[]): boolean {
	return permissions.some((p) => hasPermission(userPermissions, p));
}
