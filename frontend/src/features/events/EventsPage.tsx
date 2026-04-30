import { ArrowRight, CalendarDays, MoreVertical } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/Badge";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { useEvents } from "../../hooks/useWorkspaceResources";
import type { EventItem } from "../../types";
import { progressWidthClass, statusBadgeClass } from "../../utils/classes";
import { formatCurrency, formatDate, sentenceCase } from "../../utils/format";

export function EventsPage() {
  const { data, error, isLoading, refetch } = useEvents();
  const [viewMode, setViewMode] = useState<"cards" | "calendar">("cards");
  const [selectedEvent, setSelectedEvent] = useState<EventItem>();

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error ?? "Events are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader title="Events" description="Plan events, assign work, track volunteers, and connect files." />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-on-surface">Upcoming</h2>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          onClick={() => setViewMode((current) => (current === "cards" ? "calendar" : "cards"))}
        >
          {viewMode === "cards" ? "View Calendar" : "View Cards"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {viewMode === "calendar" ? (
        <Card className="overflow-hidden">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-outline-variant bg-surface-container-low text-xs uppercase tracking-normal text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Event</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {data.map((event) => (
                <tr key={event.id} className="cursor-pointer hover:bg-surface-container-low/60" onClick={() => setSelectedEvent(event)}>
                  <td className="px-4 py-3 text-on-surface-variant">{formatDate(event.startsAt)}</td>
                  <td className="px-4 py-3 font-semibold text-on-surface">{event.title}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusBadgeClass(event.status)}>{sentenceCase(event.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-on-surface">{formatCurrency(event.budgetUsed)} / {formatCurrency(event.budgetTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.map((event) => (
          <Card key={event.id} className="p-card-padding">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <Badge className={statusBadgeClass(event.status)}>{sentenceCase(event.status)}</Badge>
                <h3 className="mt-3 font-display text-xl font-semibold text-on-surface">{event.title}</h3>
                <p className="mt-1 flex items-center gap-2 text-sm text-on-surface-variant">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {formatDate(event.startsAt)}
                  {event.endsAt ? ` - ${formatDate(event.endsAt)}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-outline hover:bg-surface-container-low hover:text-on-surface"
                aria-label={`Open ${event.title} details`}
                onClick={() => setSelectedEvent(event)}
              >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs font-semibold">
                <span className="text-on-surface-variant">Planning Progress</span>
                <span className="text-on-surface">{event.progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-container-high">
                <div className={`h-2 rounded-full bg-primary ${progressWidthClass(event.progress)}`} />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-outline-variant pt-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-on-surface-variant">Budget Used</p>
                <p className="font-semibold text-on-surface">
                  {formatCurrency(event.budgetUsed)} <span className="font-normal text-on-surface-variant">/ {formatCurrency(event.budgetTotal)}</span>
                </p>
              </div>
              <div className="flex -space-x-2">
                {event.ownerNames.map((owner, index) => (
                  <span
                    key={`${owner}-${index}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-secondary-fixed text-xs font-bold text-secondary"
                  >
                    {owner}
                  </span>
                ))}
              </div>
            </div>
          </Card>
          ))}
        </div>
      )}

      <Modal title="Event Details" isOpen={Boolean(selectedEvent)} onClose={() => setSelectedEvent(undefined)}>
        {selectedEvent ? (
          <div className="space-y-4 text-sm">
            <div>
              <Badge className={statusBadgeClass(selectedEvent.status)}>{sentenceCase(selectedEvent.status)}</Badge>
              <h2 className="mt-3 font-display text-xl font-semibold text-on-surface">{selectedEvent.title}</h2>
              <p className="mt-1 text-on-surface-variant">{formatDate(selectedEvent.startsAt)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-on-surface-variant">Progress</p>
                <p className="mt-2 font-display text-2xl font-semibold text-on-surface">{selectedEvent.progress}%</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs font-semibold uppercase text-on-surface-variant">Budget Used</p>
                <p className="mt-2 font-display text-2xl font-semibold text-on-surface">{formatCurrency(selectedEvent.budgetUsed)}</p>
              </Card>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
