import { Download, Users } from "lucide-react";
import { useState } from "react";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useVolunteerSlots } from "../../hooks/useWorkspaceResources";
import type { VolunteerSlot } from "../../types";
import { progressWidthClass } from "../../utils/classes";
import { formatDateTime } from "../../utils/format";

export function VolunteersPage() {
  const { data, error, isLoading, refetch } = useVolunteerSlots();
  const [managedSlot, setManagedSlot] = useState<VolunteerSlot>();

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Volunteer slots are unavailable"} onRetry={refetch} />;

  const slots = data;
  const totalHours = slots.reduce((total, slot) => total + slot.filled * slot.hours, 0);
  const activeVolunteers = slots.reduce((total, slot) => total + slot.filled, 0);
  const openShifts = slots.reduce((total, slot) => total + Math.max(slot.capacity - slot.filled, 0), 0);

  function exportVolunteerData() {
    const rows = [
      ["Title", "Event", "Starts At", "Capacity", "Filled", "Hours"],
      ...slots.map((slot) => [slot.title, slot.eventName, slot.startsAt, String(slot.capacity), String(slot.filled), String(slot.hours)])
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "volunteer-slots.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Volunteers"
        description="Manage signup slots, attendance, and volunteer hours."
        actions={
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-lg border border-outline-variant bg-white px-4 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
            onClick={exportVolunteerData}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Data
          </button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="flex h-32 flex-col justify-between p-card-padding">
          <p className="text-sm font-medium text-on-surface-variant">Total hours this month</p>
          <p className="font-display text-3xl font-bold text-on-surface">{totalHours}<span className="ml-1 text-lg text-on-surface-variant">hrs</span></p>
        </Card>
        <Card className="flex h-32 flex-col justify-between p-card-padding">
          <p className="text-sm font-medium text-on-surface-variant">Active Volunteers</p>
          <p className="font-display text-3xl font-bold text-on-surface">{activeVolunteers}</p>
        </Card>
        <Card className="flex h-32 flex-col justify-between bg-primary p-card-padding text-on-primary">
          <p className="text-sm font-medium text-on-primary/80">Open Shifts</p>
          <p className="font-display text-3xl font-bold">{openShifts}</p>
        </Card>
      </div>

      <Card className="p-card-padding">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-on-surface">Upcoming Slots</h2>
          <button type="button" className="text-sm font-semibold text-primary hover:underline" onClick={() => setManagedSlot(slots[0])}>
            View All Schedule
          </button>
        </div>
        <div className="space-y-4">
          {slots.map((slot) => {
            const fillRate = Math.round((slot.filled / slot.capacity) * 100);
            return (
              <div key={slot.id} className="rounded-lg border border-outline-variant p-4">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-container text-primary">
                      <Users className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-on-surface">{slot.title}</h3>
                      <p className="text-sm text-on-surface-variant">{slot.eventName} · {formatDateTime(slot.startsAt)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low"
                    onClick={() => setManagedSlot(slot)}
                  >
                    Manage
                  </button>
                </div>
                <div className="mb-2 flex justify-between text-xs font-semibold">
                  <span className="text-on-surface-variant">Capacity: {slot.filled}/{slot.capacity} Filled</span>
                  <span className="text-primary">{fillRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-container-high">
                  <div className={`h-2 rounded-full bg-primary ${progressWidthClass(fillRate)}`} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Modal title="Volunteer Slot" isOpen={Boolean(managedSlot)} onClose={() => setManagedSlot(undefined)}>
        {managedSlot ? (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-semibold text-on-surface">{managedSlot.title}</p>
              <p className="text-on-surface-variant">{managedSlot.eventName}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-on-surface-variant">Filled</p>
                <p className="mt-2 font-display text-2xl font-semibold text-on-surface">{managedSlot.filled}/{managedSlot.capacity}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-on-surface-variant">Hours</p>
                <p className="mt-2 font-display text-2xl font-semibold text-on-surface">{managedSlot.hours}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-on-surface-variant">Open</p>
                <p className="mt-2 font-display text-2xl font-semibold text-on-surface">{managedSlot.capacity - managedSlot.filled}</p>
              </Card>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
