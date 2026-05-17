import { useState } from "react";
import { TextInput, Select, SelectItem, Button, InlineNotification, Stack } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { Card } from "../../components/Card";
import { useAuth } from "../../hooks/useAuth";
import { workspaceApi } from "../../api/workspaceApi";

const roleOptions = [
  { value: "admin", text: "Admin" },
  { value: "president", text: "President" },
  { value: "officer", text: "Officer" },
  { value: "member", text: "Member" },
];

export function AdminUserManager() {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("member");
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  if (user?.role !== "admin") return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotification(null);
    if (!email.trim() || !displayName.trim()) return;
    setSubmitting(true);
    try {
      await workspaceApi.createAdminUser({
        email: email.trim(),
        displayName: displayName.trim(),
        role,
      });
      setNotification({ kind: "success", message: `User ${email} created successfully.` });
      setEmail("");
      setDisplayName("");
      setRole("member");
    } catch (err) {
      setNotification({
        kind: "error",
        message: err instanceof Error ? err.message : "Failed to create user",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card padding="lg">
      <h2
        style={{
          fontSize: "1.125rem",
          fontWeight: 600,
          marginBottom: "1rem",
          color: "var(--cds-text-primary)",
        }}
      >
        User Management
      </h2>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--cds-text-secondary)",
          marginBottom: "1rem",
        }}
      >
        Create new user accounts. The user will receive an email with sign-in instructions.
      </p>

      {notification && (
        <div style={{ marginBottom: "1rem" }}>
          <InlineNotification
            kind={notification.kind}
            title={notification.message}
            lowContrast
            onClose={() => setNotification(null)}
          />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Stack gap={5}>
          <TextInput
            id="admin-user-email"
            labelText="Email"
            type="email"
            value={email}
            onChange={(e: any) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={submitting}
          />
          <TextInput
            id="admin-user-name"
            labelText="Display name"
            value={displayName}
            onChange={(e: any) => setDisplayName(e.target.value)}
            placeholder="Jane Smith"
            disabled={submitting}
          />
          <Select
            id="admin-user-role"
            labelText="Role"
            value={role}
            onChange={(e: any) => setRole(e.target.value)}
            disabled={submitting}
          >
            {roleOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} text={opt.text} />
            ))}
          </Select>
          <Button
            type="submit"
            renderIcon={Add}
            disabled={!email.trim() || !displayName.trim() || submitting}
          >
            {submitting ? "Creating..." : "Create User"}
          </Button>
        </Stack>
      </form>
    </Card>
  );
}
