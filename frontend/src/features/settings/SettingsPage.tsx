import { useState, useEffect } from "react";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Toggle, TextInput, Select, SelectItem, Button } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useSettings } from "../../hooks/useWorkspaceResources";
import type { WorkspaceSettings } from "../../types";
import { Save, Checkmark } from "@carbon/icons-react";

export function SettingsPage() {
  const { data, error, isLoading, refetch } = useSettings();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [form, setForm] = useState<WorkspaceSettings>({
    workspaceName: "",
    defaultVisibility: "members",
    requireProposalApproval: false,
    allowMemberInvites: false,
    fiscalYearStart: "",
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  async function handleSave() {
    setSaving(true);
    setSaveError(undefined);
    setSaved(false);
    try {
      await workspaceApi.updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Settings unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Workspace Settings"
        description="Configure workspace defaults, approvals, and policies."
        actions={
          <Button renderIcon={saved ? Checkmark : Save} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
          </Button>
        }
      />

      {saveError ? (
        <p
          style={{
            marginBottom: "1rem",
            borderLeft: "4px solid var(--cds-support-error)",
            backgroundColor: "#fff1f1",
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            color: "#a2191f",
          }}
        >
          {saveError}
        </p>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
        <Card padding="lg">
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
            General
          </h2>
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="ws-name"
              labelText="Workspace name"
              value={form.workspaceName}
              onChange={(e) => setForm((c) => ({ ...c, workspaceName: e.target.value }))}
            />
            <Select
              id="ws-visibility"
              labelText="Default visibility"
              value={form.defaultVisibility}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  defaultVisibility: e.target.value as WorkspaceSettings["defaultVisibility"],
                }))
              }
            >
              <SelectItem value="members" text="Members" />
              <SelectItem value="officers" text="Officers" />
              <SelectItem value="private" text="Private" />
            </Select>
            <TextInput
              id="ws-fiscal"
              labelText="Fiscal year start"
              value={form.fiscalYearStart}
              onChange={(e) => setForm((c) => ({ ...c, fiscalYearStart: e.target.value }))}
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
              toggled={form.requireProposalApproval}
              onToggle={(toggled) => setForm((c) => ({ ...c, requireProposalApproval: toggled }))}
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
              toggled={form.allowMemberInvites}
              onToggle={(toggled) => setForm((c) => ({ ...c, allowMemberInvites: toggled }))}
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
