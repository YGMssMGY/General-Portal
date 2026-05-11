import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Toggle, TextInput, Select, SelectItem } from "@carbon/react";
import { useSettings } from "../../hooks/useWorkspaceResources";

export function SettingsPage() {
  const { data, error, isLoading, refetch } = useSettings();

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Settings unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Workspace Settings"
        description="Configure workspace defaults, approvals, and policies."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
        <Card padding="lg">
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            General
          </h2>
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="ws-name"
              labelText="Workspace name"
              value={data.workspaceName}
              readOnly
            />
            <Select
              id="ws-visibility"
              labelText="Default visibility"
              value={data.defaultVisibility}
              disabled
            >
              <SelectItem value="members" text="Members" />
              <SelectItem value="officers" text="Officers" />
              <SelectItem value="private" text="Private" />
            </Select>
            <TextInput
              id="ws-fiscal"
              labelText="Fiscal year start"
              value={data.fiscalYearStart}
              readOnly
            />
          </div>
        </Card>

        <Card padding="lg">
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            Policy
          </h2>
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Toggle
              id="require-approval"
              labelText="Require proposal approval"
              hideLabel
              toggled={data.requireProposalApproval}
              readOnly
              labelA="Off"
              labelB="On"
            />
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--cds-text-secondary)",
                marginTop: "-0.5rem",
              }}
            >
              Route new proposals through the approval queue.
            </div>
            <Toggle
              id="allow-invites"
              labelText="Allow member invites"
              hideLabel
              toggled={data.allowMemberInvites}
              readOnly
              labelA="Off"
              labelB="On"
            />
            <div
              style={{
                fontSize: "0.875rem",
                color: "var(--cds-text-secondary)",
                marginTop: "-0.5rem",
              }}
            >
              Let approved members invite collaborators.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
