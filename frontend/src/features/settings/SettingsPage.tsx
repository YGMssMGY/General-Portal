import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useSettings } from "../../hooks/useWorkspaceResources";

function Toggle({
  checked,
  label,
  description,
}: {
  checked: boolean;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 border border-border-subtle p-4">
      <span>
        <span className="block font-medium text-text-primary">{label}</span>
        <span className="text-sm text-text-secondary">{description}</span>
      </span>
      <input
        className="h-5 w-5 accent-carbon-blue-60"
        type="checkbox"
        checked={checked}
        disabled
        readOnly
      />
    </label>
  );
}

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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-text-primary font-condensed">General</h2>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Workspace name</span>
              <input
                className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive"
                value={data.workspaceName}
                readOnly
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Default visibility</span>
              <select
                className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive focus:ring-1 focus:ring-border-interactive"
                value={data.defaultVisibility}
                disabled
              >
                <option value="members">Members</option>
                <option value="officers">Officers</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium text-text-primary">Fiscal year start</span>
              <input
                className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none"
                value={data.fiscalYearStart}
                readOnly
              />
            </label>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-text-primary font-condensed">Policy</h2>
          <div className="mt-4 space-y-4">
            <Toggle
              checked={data.requireProposalApproval}
              label="Require proposal approval"
              description="Route new proposals through the approval queue."
            />
            <Toggle
              checked={data.allowMemberInvites}
              label="Allow member invites"
              description="Let approved members invite collaborators."
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
