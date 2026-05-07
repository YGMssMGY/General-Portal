import { createContext, useContext, useState, useMemo, useCallback, type ReactNode } from "react";
import type { UserRole } from "../mocks/data";
import { generateUserProfiles, getCurrentRole, setCurrentRole as setMockRole } from "../mocks/data";
import type { UserProfile } from "../types";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  teacher: 5,
  president: 4,
  vp: 3,
  member: 2,
  grade_rep: 1,
};

interface DemoAuthContextValue {
  user: UserProfile;
  availableRoles: UserRole[];
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
  isAtLeastRole: (role: UserRole) => boolean;
}

const DemoAuthContext = createContext<DemoAuthContextValue | undefined>(undefined);

const profiles = generateUserProfiles();

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>(() => getCurrentRole());

  const switchRole = useCallback((newRole: UserRole) => {
    setMockRole(newRole);
    setRole(newRole);
  }, []);

  const user = useMemo(() => profiles[role], [role]);

  const hasPermission = useCallback(
    (permission: string) => user.permissions.includes(permission),
    [user.permissions]
  );

  const isAtLeastRole = useCallback(
    (requiredRole: UserRole) => {
      return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
    },
    [role]
  );

  const value = useMemo<DemoAuthContextValue>(
    () => ({
      user,
      availableRoles: Object.keys(profiles) as UserRole[],
      currentRole: role,
      switchRole,
      isAuthenticated: true,
      isLoading: false,
      hasPermission,
      isAtLeastRole,
    }),
    [user, role, switchRole, hasPermission, isAtLeastRole]
  );

  return <DemoAuthContext.Provider value={value}>{children}</DemoAuthContext.Provider>;
}

export function useDemoAuth(): DemoAuthContextValue {
  const ctx = useContext(DemoAuthContext);
  if (!ctx) throw new Error("useDemoAuth must be used inside DemoAuthProvider");
  return ctx;
}
