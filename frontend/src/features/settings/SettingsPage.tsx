import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useSettings } from "../../hooks/useWorkspaceResources";

function Toggle({
  checked,
  label,
  description
}: {
  checked: boolean;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-outline-variant p-4">
      <span>
        <span className="block font-semibold text-on-surface">{label}</span>
        <span className="text-sm text-on-surface-variant">{description}</span>
      </span>
      <input className="h-5 w-5 accent-primary" type="checkbox" checked={checked} disabled readOnly />
    </label>
  );
}

export function SettingsPage() {
  const { data, error, isLoading, refetch } = useSettings();

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Settings are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Workspace Settings"
        description="Configure workspace defaults, approvals, and access policies."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-card-padding">
          <h2 className="font-display text-lg font-semibold text-on-surface">General</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Workspace name</span>
              <input
                className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={data.workspaceName}
                readOnly
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Default visibility</span>
              <select
                className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={data.defaultVisibility}
                disabled
              >
                <option value="members">Members</option>
                <option value="officers">Officers</option>
                <option value="private">Private</option>
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-on-surface">Fiscal year start</span>
              <input
                className="rounded-lg border border-outline-variant bg-white px-4 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={data.fiscalYearStart}
                readOnly
              />
            </label>
          </div>
        </Card>

        <Card className="p-card-padding">
          <h2 className="font-display text-lg font-semibold text-on-surface">Policy</h2>
          <div className="mt-5 space-y-4">
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
