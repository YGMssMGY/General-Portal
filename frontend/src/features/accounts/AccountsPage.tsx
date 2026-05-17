import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Tile, Stack, Tag, Button } from "@carbon/react";
import { PageHeader } from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { AdminUserManager } from "./AdminUserManager";
import { getClientConfig } from "../../config/clientConfig";

export function AccountsPage() {
  const { user } = useAuth();
  const config = useMemo(() => getClientConfig(), []);

  return (
    <div>
      <PageHeader title="Account" description="View your account details and manage users." />

      <Stack gap={6}>
        <Tile style={{ padding: "1.5rem" }}>
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "var(--cds-text-primary)",
            }}
          >
            Your Account
          </h3>
          <Stack gap={5}>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Name
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>
                {user?.displayName || "—"}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Email
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>
                {user?.email || "—"}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Role
              </p>
              <Tag
                type={
                  user?.role === "admin"
                    ? "red"
                    : user?.role === "president"
                      ? "purple"
                      : user?.role === "officer"
                        ? "blue"
                        : "gray"
                }
              >
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "—"}
              </Tag>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "var(--cds-text-secondary)",
                  marginBottom: "0.25rem",
                }}
              >
                Workspace
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>
                {user?.workspaceName || config.displayName}
              </p>
            </div>
          </Stack>
        </Tile>

        <AdminUserManager />
      </Stack>
    </div>
  );
}
