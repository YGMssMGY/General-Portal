import { useState, useEffect } from "react";
import {
  Grid,
  Column,
  TextInput,
  Select,
  SelectItem,
  Toggle,
  Button,
  FileUploader,
  Tile,
  Stack,
  Tag,
  InlineNotification,
} from "@carbon/react";
import { Save, Checkmark, Add, TrashCan } from "@carbon/icons-react";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Modal } from "../../components/Modal";
import { workspaceApi } from "../../api/workspaceApi";
import { useSettings, useModules, useApprovalRules } from "../../hooks/useWorkspaceResources";
import { useAuth } from "../../hooks/useAuth";
import type { WorkspaceSettings, ModuleSettings, ApprovalRule } from "../../types";

const moduleLabels: Record<keyof ModuleSettings, string> = {
  tasks: "Tasks",
  events: "Events",
  finance: "Finance",
  volunteers: "Volunteers",
};

const moduleDescriptions: Record<keyof ModuleSettings, string> = {
  tasks: "Task management and Kanban boards",
  events: "Event planning and scheduling",
  finance: "Budget tracking and expense reports",
  volunteers: "Volunteer sign-up and hour tracking",
};

const visibilityOptions = [
  { value: "members", text: "Members" },
  { value: "officers", text: "Officers" },
  { value: "private", text: "Private" },
];

const orgTypeOptions = [
  { value: "nonprofit", text: "Non-Profit" },
  { value: "educational", text: "Educational" },
  { value: "corporate", text: "Corporate" },
  { value: "government", text: "Government" },
  { value: "other", text: "Other" },
];

const fiscalMonthOptions = [
  { value: "January", text: "January" },
  { value: "February", text: "February" },
  { value: "March", text: "March" },
  { value: "April", text: "April" },
  { value: "May", text: "May" },
  { value: "June", text: "June" },
  { value: "July", text: "July" },
  { value: "August", text: "August" },
  { value: "September", text: "September" },
  { value: "October", text: "October" },
  { value: "November", text: "November" },
  { value: "December", text: "December" },
];

/* ---------- New Rule Modal ---------- */

function NewRuleModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Pick<ApprovalRule, "triggerType" | "triggerValue" | "approvers">) => Promise<void>;
}) {
  const [triggerType, setTriggerType] = useState("amount");
  const [triggerValue, setTriggerValue] = useState("");
  const [approvers, setApprovers] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!triggerValue.trim() || !approvers.trim()) return;
    setSaving(true);
    try {
      await onSave({
        triggerType,
        triggerValue: triggerValue.trim(),
        approvers: approvers.split(",").map((a) => a.trim()),
      });
      setTriggerValue("");
      setApprovers("");
      onClose();
    } catch {
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Approval Rule" isOpen={isOpen} onClose={onClose}>
      <Stack gap={5}>
        <Select
          id="rule-trigger-type"
          labelText="Trigger type"
          value={triggerType}
          onChange={(e: any) => setTriggerType(e.target.value)}
        >
          <SelectItem value="amount" text="Amount exceeds" />
          <SelectItem value="type" text="Transaction type" />
          <SelectItem value="role" text="Submitter role" />
        </Select>
        <TextInput
          id="rule-trigger-value"
          labelText={
            triggerType === "amount"
              ? "Value (e.g. 1000)"
              : triggerType === "type"
                ? "Transaction type (e.g. Purchase)"
                : "Role (e.g. officer)"
          }
          placeholder={
            triggerType === "amount" ? "1000" : triggerType === "type" ? "Purchase" : "officer"
          }
          value={triggerValue}
          onChange={(e: any) => setTriggerValue(e.target.value)}
        />
        <TextInput
          id="rule-approvers"
          labelText="Approvers (comma-separated emails)"
          placeholder="user1@example.com, user2@example.com"
          value={approvers}
          onChange={(e: any) => setApprovers(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button kind="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!triggerValue.trim() || !approvers.trim() || saving}
          >
            {saving ? "Adding..." : "Add Rule"}
          </Button>
        </div>
      </Stack>
    </Modal>
  );
}

/* ---------- Main Settings Page ---------- */

export function SettingsPage() {
  const { user } = useAuth();
  const {
    data: settings,
    error: settingsError,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useSettings();
  const {
    data: modules,
    error: modulesError,
    isLoading: modulesLoading,
    refetch: refetchModules,
  } = useModules();
  const {
    data: rules,
    error: rulesError,
    isLoading: rulesLoading,
    refetch: refetchRules,
  } = useApprovalRules();

  const [form, setForm] = useState<WorkspaceSettings>({
    workspaceName: "",
    defaultVisibility: "members",
    requireProposalApproval: false,
    allowMemberInvites: false,
    fiscalYearStart: "",
  });
  const [orgType, setOrgType] = useState("nonprofit");
  const [primaryContact, setPrimaryContact] = useState("");
  const [moduleToggles, setModuleToggles] = useState<ModuleSettings>({
    tasks: true,
    events: true,
    finance: true,
    volunteers: true,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [ruleModalOpen, setRuleModalOpen] = useState(false);

  const isLoading = settingsLoading || modulesLoading || rulesLoading;
  const error = settingsError || modulesError || rulesError;

  // Hydrate form from fetched data
  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  useEffect(() => {
    if (modules) setModuleToggles(modules);
  }, [modules]);

  // Fetch logo on mount
  useEffect(() => {
    workspaceApi
      .getWorkspaceLogo()
      .then((res) => setLogoPreview(res.url))
      .catch(() => {});
  }, []);

  const handleLogoToggle = (_: any, data?: any) => {
    if (data?.addedFiles && data.addedFiles.length > 0) {
      const raw = data.addedFiles[0];
      const file = "file" in raw ? raw.file : raw;
      if (!file) return;
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) setLogoPreview(e.target.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  async function uploadLogo() {
    if (!logoFile) return;
    const formData = new FormData();
    formData.append("logo", logoFile);
    const result = await workspaceApi.uploadLogo(formData);
    setLogoPreview(result.url);
    setLogoFile(null);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(undefined);
    setSaved(false);
    try {
      await workspaceApi.updateSettings(form);
      if (logoFile) await uploadLogo();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      refetchSettings();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleModuleToggle(module: keyof ModuleSettings, enabled: boolean) {
    setModuleToggles((prev) => ({ ...prev, [module]: enabled }));
    try {
      await workspaceApi.updateModule(module, enabled);
      refetchModules();
    } catch {
      // revert
      refetchModules();
    }
  }

  async function handleAddRule(
    rule: Pick<ApprovalRule, "triggerType" | "triggerValue" | "approvers">,
  ) {
    await workspaceApi.createApprovalRule(rule);
    refetchRules();
  }

  async function handleDeleteRule(id: string) {
    await workspaceApi.deleteApprovalRule(id);
    refetchRules();
  }

  if (isLoading) return <LoadingState />;
  if (error)
    return <ErrorState message={error ?? "Settings unavailable"} onRetry={refetchSettings} />;

  return (
    <div>
      <PageHeader
        title="Workspace Settings"
        description="Configure workspace defaults, modules, and policies."
        actions={
          <Button renderIcon={saved ? Checkmark : Save} onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
          </Button>
        }
      />

      {saveError ? (
        <div style={{ marginBottom: "1rem" }}>
          <InlineNotification
            kind="error"
            title={saveError}
            lowContrast
            onClose={() => setSaveError(undefined)}
          />
        </div>
      ) : null}

      <Grid style={{ padding: 0 }}>
        {/* Left column: General + Organization */}
        <Column lg={8} md={8} sm={4}>
          <Stack gap={6}>
            {/* General Section */}
            <Card padding="lg">
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                  color: "var(--cds-text-primary)",
                }}
              >
                General
              </h2>
              <Stack gap={5}>
                <TextInput
                  id="ws-name"
                  labelText="Workspace name"
                  value={form.workspaceName}
                  onChange={(e: any) => setForm((c) => ({ ...c, workspaceName: e.target.value }))}
                />
                <Select
                  id="ws-visibility"
                  labelText="Default visibility"
                  value={form.defaultVisibility}
                  onChange={(e: any) =>
                    setForm((c) => ({
                      ...c,
                      defaultVisibility: e.target.value as WorkspaceSettings["defaultVisibility"],
                    }))
                  }
                >
                  {visibilityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} text={opt.text} />
                  ))}
                </Select>
                <Select
                  id="ws-fiscal"
                  labelText="Fiscal year start"
                  value={form.fiscalYearStart || "January"}
                  onChange={(e: any) => setForm((c) => ({ ...c, fiscalYearStart: e.target.value }))}
                >
                  {fiscalMonthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} text={opt.text} />
                  ))}
                </Select>
              </Stack>
            </Card>

            {/* Organization Section */}
            <Card padding="lg">
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                  color: "var(--cds-text-primary)",
                }}
              >
                Organization
              </h2>
              <Stack gap={5}>
                <Select
                  id="org-type"
                  labelText="Organization type"
                  value={orgType}
                  onChange={(e: any) => setOrgType(e.target.value)}
                >
                  {orgTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} text={opt.text} />
                  ))}
                </Select>
                <TextInput
                  id="org-contact"
                  labelText="Primary contact email"
                  type="email"
                  value={primaryContact}
                  onChange={(e: any) => setPrimaryContact(e.target.value)}
                />
              </Stack>
            </Card>

            {/* Terminology Labels Section */}
            <Card padding="lg">
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                  color: "var(--cds-text-primary)",
                }}
              >
                Terminology Labels
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--cds-text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Customize how certain terms are displayed in the workspace. API-backed editing
                coming soon.
              </p>
              <Stack gap={5}>
                <TextInput id="term-member" labelText="Member / Partner" value="Member" disabled />
                <TextInput id="term-event" labelText="Event / Gathering" value="Event" disabled />
                <TextInput
                  id="term-proposal"
                  labelText="Proposal / Initiative"
                  value="Proposal"
                  disabled
                />
                <TextInput id="term-task" labelText="Task" value="Task" disabled />
              </Stack>
            </Card>
          </Stack>
        </Column>

        {/* Right column: Logo + Modules + Approval */}
        <Column lg={8} md={8} sm={4}>
          <Stack gap={6}>
            {/* Logo Upload */}
            <Card padding="lg">
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                  color: "var(--cds-text-primary)",
                }}
              >
                Workspace Logo
              </h2>
              {logoPreview ? (
                <div
                  style={{
                    marginBottom: "1rem",
                    padding: "1rem",
                    background: "var(--cds-layer-02)",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    maxHeight: "120px",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={logoPreview}
                    alt="Workspace logo preview"
                    style={{ maxHeight: "100px", maxWidth: "100%", objectFit: "contain" }}
                  />
                </div>
              ) : null}
              <FileUploader
                labelTitle="Upload workspace logo"
                labelDescription="PNG, JPG, or SVG. 2MB max."
                buttonLabel="Select image"
                buttonKind="tertiary"
                filenameStatus="edit"
                accept={[".png", ".jpg", ".jpeg", ".svg"] as string[]}
                onChange={handleLogoToggle}
              />
            </Card>

            {/* Module Toggles */}
            <Card padding="lg">
              <h2
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                  color: "var(--cds-text-primary)",
                }}
              >
                Module Toggles
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--cds-text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Enable or disable workspace modules. Disabled modules are hidden from navigation.
              </p>
              <Stack gap={5}>
                {(Object.keys(moduleLabels) as (keyof ModuleSettings)[]).map((key) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: "0.75rem",
                      borderBottom: "1px solid var(--cds-border-subtle)",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 500,
                          color: "var(--cds-text-primary)",
                        }}
                      >
                        {moduleLabels[key]}
                      </p>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--cds-text-secondary)",
                          marginTop: "0.125rem",
                        }}
                      >
                        {moduleDescriptions[key]}
                      </p>
                    </div>
                    <Toggle
                      id={`toggle-${key}`}
                      labelText=""
                      hideLabel
                      labelA="Off"
                      labelB="On"
                      toggled={moduleToggles[key]}
                      onToggle={(toggled: boolean) => handleModuleToggle(key, toggled)}
                    />
                  </div>
                ))}
              </Stack>
            </Card>

            {/* Admin User Management */}
            {user?.role === "admin" && (
              <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
                Go to Accounts page to manage users.
              </p>
            )}

            {/* Approval Workflows */}
            <Card padding="lg">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "var(--cds-text-primary)",
                  }}
                >
                  Approval Workflows
                </h2>
                <Button
                  kind="tertiary"
                  size="sm"
                  renderIcon={Add}
                  onClick={() => setRuleModalOpen(true)}
                >
                  Add Rule
                </Button>
              </div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--cds-text-secondary)",
                  marginBottom: "1rem",
                }}
              >
                Configure automatic approval rules for proposals and finance transactions.
              </p>
              {rules && rules.length > 0 ? (
                <Stack gap={3}>
                  {rules.map((rule) => (
                    <Tile
                      key={rule.id}
                      style={{
                        padding: "0.75rem 1rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "center",
                            marginBottom: "0.25rem",
                          }}
                        >
                          <Tag type="blue">{rule.triggerType}</Tag>
                          <span
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 500,
                              color: "var(--cds-text-primary)",
                            }}
                          >
                            {rule.triggerValue}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--cds-text-secondary)",
                          }}
                        >
                          Approvers: {rule.approvers.join(", ")}
                        </p>
                      </div>
                      <Button
                        kind="ghost"
                        size="sm"
                        renderIcon={TrashCan}
                        hasIconOnly
                        iconDescription="Delete rule"
                        onClick={() => handleDeleteRule(rule.id)}
                      />
                    </Tile>
                  ))}
                </Stack>
              ) : (
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--cds-text-secondary)",
                    fontStyle: "italic",
                  }}
                >
                  No approval rules configured. Add a rule to automate approvals.
                </p>
              )}
            </Card>
          </Stack>
        </Column>
      </Grid>

      {/* New Rule Modal */}
      <NewRuleModal
        isOpen={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        onSave={handleAddRule}
      />
    </div>
  );
}
