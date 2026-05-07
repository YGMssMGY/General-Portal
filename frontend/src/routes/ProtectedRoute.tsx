import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  children?: React.ReactNode;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  teacher: 5,
  president: 4,
  vp: 3,
  member: 2,
  grade_rep: 1,
};

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-skeleton-pulse rounded-full bg-surface-hover" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user?.role) {
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    if (userLevel < requiredLevel) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="border border-border-subtle bg-surface p-8 text-center max-w-md">
            <h2 className="text-xl font-semibold text-text-primary">Access Denied</h2>
            <p className="mt-2 text-sm text-text-secondary">
              You need at least {requiredRole} level access to view this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
