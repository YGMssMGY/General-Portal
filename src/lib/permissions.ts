export type Permission =
  | "manage_users"
  | "manage_proposals"
  | "manage_tasks"
  | "manage_events"
  | "manage_messages"
  | "manage_finance"
  | "manage_volunteers"
  | "manage_meetings"
  | "manage_budget"
  | "manage_settings"
  | "view_audit"
  | "view_activity"
  | "manage_files"
  | "view_members"
  | "send_kudos"
  | "manage_notifications"
  | "manage_search";

const ALL_PERMISSIONS: Permission[] = [
  "manage_users",
  "manage_proposals",
  "manage_tasks",
  "manage_events",
  "manage_messages",
  "manage_finance",
  "manage_volunteers",
  "manage_meetings",
  "manage_budget",
  "manage_settings",
  "view_audit",
  "view_activity",
  "manage_files",
  "view_members",
  "send_kudos",
  "manage_notifications",
  "manage_search",
];

const OFFICER_PERMISSIONS: Permission[] = ALL_PERMISSIONS.filter(
  (p) => p !== "manage_users" && p !== "manage_settings" && p !== "view_audit",
);

const MEMBER_PERMISSIONS: Permission[] = [
  "manage_proposals",
  "manage_tasks",
  "manage_events",
  "manage_messages",
  "manage_volunteers",
  "manage_meetings",
  "view_activity",
  "manage_files",
  "view_members",
  "send_kudos",
  "manage_notifications",
];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ALL_PERMISSIONS,
  officer: OFFICER_PERMISSIONS,
  member: MEMBER_PERMISSIONS,
};

export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function getRolePermissions(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
