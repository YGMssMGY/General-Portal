export type Permission =
  // Member-level (self-service)
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
  // Officer-level (group management)
  | "approve_proposal"
  | "manage_all_tasks"
  | "manage_all_events"
  | "manage_all_messages"
  | "manage_volunteer_slots"
  | "manage_meetings"
  | "manage_finance"
  | "manage_budget"
  | "manage_showcase"
  | "manage_subgroups"
  // Admin-only
  | "manage_users"
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
];

const OFFICER_PERMISSIONS: Permission[] = [
  ...MEMBER_PERMISSIONS,
  "approve_proposal",
  "manage_all_tasks",
  "manage_all_events",
  "manage_all_messages",
  "manage_volunteer_slots",
  "manage_meetings",
  "manage_finance",
  "manage_budget",
  "manage_showcase",
  "manage_subgroups",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...OFFICER_PERMISSIONS,
  "manage_users",
  "manage_settings",
  "view_audit",
];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: ADMIN_PERMISSIONS,
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
