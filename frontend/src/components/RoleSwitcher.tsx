import { useDemoAuth } from "../context/DemoAuthContext";
import type { UserRole } from "../mocks/data";

const ROLE_LABELS: Record<UserRole, string> = {
  teacher: "Teacher",
  president: "President",
  vp: "Vice President",
  member: "Member",
  grade_rep: "Grade Rep",
};

export function RoleSwitcher() {
  const { currentRole, availableRoles, switchRole } = useDemoAuth();

  return (
    <div className="flex items-center">
      <select
        value={currentRole}
        onChange={(e) => switchRole(e.target.value as UserRole)}
        className="h-8 border-b border-border-subtle bg-transparent px-2 text-xs font-medium text-text-secondary outline-none hover:border-border-interactive focus:border-border-interactive"
        aria-label="Switch demo role"
      >
        {availableRoles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </div>
  );
}
