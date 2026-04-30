import { Filter, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useMembers } from "../../hooks/useWorkspaceResources";

export function MembersPage() {
  const { data, error, isLoading, refetch } = useMembers();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [accessFilter, setAccessFilter] = useState("all");

  const filteredMembers = useMemo(() => {
    if (!data) return [];
    return data.filter((member) => accessFilter === "all" || member.accessLabel === accessFilter);
  }, [accessFilter, data]);

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Members are unavailable"} onRetry={refetch} />;

  const totalHours = data.reduce((total, member) => total + member.volunteerHours, 0);
  const accessOptions = Array.from(new Set(data.map((member) => member.accessLabel)));

  return (
    <div>
      <PageHeader title="Members" description="Manage people, roles, positions, and access." />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="flex items-center justify-between p-card-padding">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">Total Members</p>
            <p className="mt-2 font-display text-3xl font-bold text-primary">{data.length}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
        </Card>
        <Card className="p-card-padding">
          <p className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">Tracked Hours</p>
          <p className="mt-2 font-display text-3xl font-bold text-secondary">{totalHours}</p>
        </Card>
        <Card className="p-card-padding">
          <p className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">Access Levels</p>
          <p className="mt-2 font-display text-3xl font-bold text-tertiary">{accessOptions.length}</p>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-outline-variant bg-white p-card-padding sm:flex-row sm:items-center">
          <h2 className="font-display text-lg font-semibold text-on-surface">Directory</h2>
          <div className="flex gap-3">
            <button type="button" className="flex h-10 items-center gap-2 rounded-lg border border-outline-variant px-4 text-sm font-semibold text-on-surface hover:bg-surface-container-low" onClick={() => setIsFilterOpen((current) => !current)}>
              <Filter className="h-4 w-4" aria-hidden="true" />
              Filter
            </button>
          </div>
        </div>
        {isFilterOpen ? (
          <div className="border-b border-outline-variant bg-surface-container-low/60 p-4">
            <label className="grid max-w-xs gap-2">
              <span className="text-sm font-semibold text-on-surface">Access</span>
              <select
                className="rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                value={accessFilter}
                onChange={(event) => setAccessFilter(event.target.value)}
              >
                <option value="all">All access levels</option>
                {accessOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-normal text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">Access</th>
                <th className="px-4 py-3 text-right font-semibold">Tasks</th>
                <th className="px-4 py-3 text-right font-semibold">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-surface-container-low/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary-fixed text-xs font-bold text-secondary">
                        {member.name
                          .split(" ")
                          .map((part) => part[0] ?? "")
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface">{member.name}</p>
                        <p className="text-xs text-on-surface-variant">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-on-surface">{member.position}</td>
                  <td className="px-4 py-3">
                    <Badge className="bg-secondary-fixed text-secondary">{member.accessLabel}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface">{member.taskCount}</td>
                  <td className="px-4 py-3 text-right text-on-surface">{member.volunteerHours}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMembers.length === 0 ? <p className="p-6 text-sm text-on-surface-variant">No members match the current filter.</p> : null}
        </div>
      </Card>
    </div>
  );
}
