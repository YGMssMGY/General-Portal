import { useMemo, useState, useEffect } from "react";
import { Tile, Stack, Tag } from "@carbon/react";
import { PageHeader } from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { AdminUserManager } from "./AdminUserManager";
import { getClientConfig } from "../../config/clientConfig";
import { workspaceApi } from "../../api/workspaceApi";

export function AccountsPage() {
  const { user } = useAuth();
  const config = useMemo(() => getClientConfig(), []);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  useEffect(() => {
    if (user?.role === "admin") {
      workspaceApi
        .getAdminUsers()
        .then(setAllUsers)
        .catch(() => {});
    }
  }, [user?.role]);

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
                {user?.displayName || "\u2014"}
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
                Username
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>
                {user?.email || "\u2014"}
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
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "\u2014"}
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

        {user?.role === "admin" && (
          <Tile style={{ padding: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                marginBottom: "1rem",
                color: "var(--cds-text-primary)",
              }}
            >
              All Accounts
            </h3>
            {allUsers.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                No users found.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {allUsers.map((u: any) => (
                  <div
                    key={u.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.5rem 0.75rem",
                      background: "var(--cds-layer)",
                      borderRadius: "4px",
                    }}
                  >
                    <div
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "50%",
                        background: "var(--cds-button-tertiary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "var(--cds-text-primary)",
                        }}
                      >
                        {u.displayName}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--cds-text-secondary)" }}>
                        {u.email}
                      </p>
                    </div>
                    <Tag
                      type={
                        u.role === "admin"
                          ? "red"
                          : u.role === "president"
                            ? "purple"
                            : u.role === "officer"
                              ? "blue"
                              : "gray"
                      }
                    >
                      {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                    </Tag>
                  </div>
                ))}
              </div>
            )}
          </Tile>
        )}

        <AdminUserManager />
      </Stack>
    </div>
  );
}
