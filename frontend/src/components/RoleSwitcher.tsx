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
    <select
      value={currentRole}
      onChange={(e) => switchRole(e.target.value as UserRole)}
      aria-label="Switch demo role"
      style={{
        height: "2rem",
        border: "none",
        borderBottom: "2px solid var(--cds-border-subtle)",
        background: "transparent",
        padding: "0 0.5rem",
        fontSize: "0.75rem",
        fontWeight: 500,
        color: "var(--cds-text-secondary)",
        outline: "none",
        cursor: "pointer",
      }}
    >
      {availableRoles.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}
