import { Navigate, Outlet } from "react-router-dom";
import { Tile, Loading } from "@carbon/react";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types";

interface ProtectedRouteProps {
  requiredRole?: UserRole;
  children?: React.ReactNode;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 4,
  president: 3,
  officer: 2,
  member: 1,
};

export function ProtectedRoute({ requiredRole, children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--cds-background)",
        }}
      >
        <Loading withOverlay={false} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const userLevel = user?.role ? (ROLE_HIERARCHY[user.role] ?? 0) : 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    if (userLevel < requiredLevel) {
      return (
        <div
          style={{
            display: "flex",
            minHeight: "60vh",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Tile style={{ padding: "2rem", textAlign: "center", maxWidth: "28rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
              Access Denied
            </h2>
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.875rem",
                color: "var(--cds-text-secondary)",
              }}
            >
              You need at least {requiredRole} level access to view this page.
            </p>
          </Tile>
        </div>
      );
    }
  }

  return children ? <>{children}</> : <Outlet />;
}
