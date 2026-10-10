import type { PortalDb } from "@/db/client";
import { memberships, roles } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type Permission =
    | "view_members"
    | "view_activity"
    | "manage_notifications"
    | "send_kudos"
    | "manage_search"
    | "manage_files"
    | "create_proposal"
    | "create_task"
    | "create_event"
    | "send_message"
    | "signup_volunteer"
    | "rsvp_meeting"
    | "check_in"
    | "approve_proposal"
    | "manage_all_tasks"
    | "manage_all_events"
    | "manage_all_messages"
    | "manage_volunteer_slots"
    | "manage_meetings"
    | "manage_minutes"
    | "manage_attendance"
    | "manage_finance"
    | "manage_budget"
    | "manage_showcase"
    | "manage_subgroups"
    | "manage_partnerships"
    | "manage_purchase_requests"
    | "manage_workflows"
    | "manage_custom_fields"
    | "manage_webhooks"
    | "manage_api_tokens"
    | "manage_polls"
    | "manage_goals"
    | "manage_assets"
    | "manage_dues"
    | "manage_decisions"
    | "manage_time"
    | "export_data"
    | "manage_announcements"
    | "view_reports"
    | "manage_reports"
    | "manage_users"
    | "manage_roles"
    | "manage_settings"
    | "view_audit";

const MEMBER_PERMISSIONS: Permission[] = [
    "view_members",
    "view_activity",
    "manage_notifications",
    "send_kudos",
    "manage_search",
    "manage_files",
    "create_proposal",
    "create_task",
    "create_event",
    "send_message",
    "signup_volunteer",
    "rsvp_meeting",
    "check_in",
    "manage_time",
];

const OFFICER_PERMISSIONS: Permission[] = [
    ...MEMBER_PERMISSIONS,
    "approve_proposal",
    "manage_all_tasks",
    "manage_all_events",
    "manage_all_messages",
    "manage_volunteer_slots",
    "manage_meetings",
    "manage_minutes",
    "manage_attendance",
    "manage_finance",
    "manage_budget",
    "manage_showcase",
    "manage_subgroups",
    "manage_partnerships",
    "manage_purchase_requests",
    "manage_workflows",
    "manage_custom_fields",
    "manage_webhooks",
    "manage_api_tokens",
    "manage_polls",
    "manage_goals",
    "manage_assets",
    "manage_dues",
    "manage_decisions",
    "export_data",
    "manage_announcements",
    "manage_polls",
    "manage_goals",
    "manage_assets",
    "manage_dues",
    "manage_decisions",
    "export_data",
    "manage_announcements",
    "view_reports",
    "manage_reports",
];

const ADMIN_PERMISSIONS: Permission[] = [
    ...OFFICER_PERMISSIONS,
    "manage_users",
    "manage_roles",
    "manage_settings",
    "view_audit",
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
    admin: ADMIN_PERMISSIONS,
    officer: OFFICER_PERMISSIONS,
    member: MEMBER_PERMISSIONS,
};

export const DEFAULT_ROLES = [
    { name: "admin", description: "Full control of the workspace", isSystem: true },
    { name: "officer", description: "Manages groups, content, and approvals", isSystem: true },
    { name: "member", description: "Participates in workspace activities", isSystem: true },
] as const;

export function getDefaultPermissions(roleName: string): Permission[] {
    return DEFAULT_ROLE_PERMISSIONS[roleName] ?? [];
}

export async function resolvePermissions(
    db: PortalDb,
    workspaceId: string,
    roleId: string | null,
    roleNameFallback: string,
): Promise<Permission[]> {
    if (roleId) {
        const rows = await db
            .select({ permissions: roles.permissions })
            .from(roles)
            .where(and(eq(roles.id, roleId), eq(roles.workspaceId, workspaceId)))
            .limit(1);
        if (rows[0]) return rows[0].permissions as Permission[];
    }
    return getDefaultPermissions(roleNameFallback);
}

export async function membershipRoleName(
    db: PortalDb,
    workspaceId: string,
    userId: string,
): Promise<string> {
    const rows = await db
        .select({ roleId: memberships.roleId })
        .from(memberships)
        .where(and(eq(memberships.workspaceId, workspaceId), eq(memberships.userId, userId)))
        .limit(1);
    if (!rows[0]?.roleId) return "member";
    const r = await db
        .select({ name: roles.name })
        .from(roles)
        .where(eq(roles.id, rows[0].roleId))
        .limit(1);
    return r[0]?.name ?? "member";
}

export function hasPermission(permissions: string[], permission: Permission): boolean {
    return permissions.includes(permission);
}
