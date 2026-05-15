import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Button, TextInput, Select, SelectItem, Form } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useEvents } from "../../hooks/useWorkspaceResources";
import type { EventItem, ResourceStatus } from "../../types";
import { formatDate } from "../../utils/format";
import { Add, Edit, TrashCan } from "@carbon/icons-react";

export function EventsPage() {
  const { data, error, isLoading, refetch } = useEvents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem>();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<EventItem>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    startsAt: new Date().toISOString().slice(0, 10),
  });

  const columns: ColumnDef<EventItem>[] = useMemo(
    () => [
      {
        key: "startsAt",
        header: "Date",
        sortable: true,
        render: (event) => formatDate(event.startsAt),
      },
      { key: "title", header: "Event", sortable: true },
      {
        key: "status",
        header: "Status",
        sortable: true,
        render: (event) => (
          <Select
            id={`evt-status-${event.id}`}
            labelText=""
            hideLabel
            size="sm"
            value={event.status}
            onChange={async (e) => {
              const newStatus = e.target.value as ResourceStatus;
              try {
                await workspaceApi.updateEvent(event.id, { status: newStatus });
                refetch();
              } catch {}
            }}
          >
            <SelectItem value="draft" text="Draft" />
            <SelectItem value="active" text="Active" />
            <SelectItem value="completed" text="Completed" />
          </Select>
        ),
      },
      {
        key: "progress",
        header: "Progress",
        sortable: true,
        render: (event) => `${event.progress}%`,
        className: "text-right",
      },
      {
        key: "actions",
        header: "",
        render: (event) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Edit}
              iconDescription="Edit"
              hasIconOnly
              onClick={() => {
                setEditingEvent(event);
                setForm({ title: event.title, startsAt: event.startsAt?.slice(0, 10) ?? "" });
                setIsModalOpen(true);
              }}
            />
            <Button
              kind="ghost"
              size="sm"
              renderIcon={TrashCan}
              iconDescription="Delete"
              hasIconOnly
              onClick={() => setDeleteTarget(event)}
            />
          </div>
        ),
      },
    ],
    [refetch],
  );

  function openCreateModal() {
    setEditingEvent(undefined);
    setForm({ title: "", startsAt: new Date().toISOString().slice(0, 10) });
    setIsModalOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);
    try {
      if (editingEvent) {
        await workspaceApi.updateEvent(editingEvent.id, {
          title: form.title,
          startsAt: form.startsAt,
        });
      } else {
        await workspaceApi.createEvent({
          title: form.title,
          startsAt: form.startsAt,
          status: "draft",
        });
      }
      setIsModalOpen(false);
      setEditingEvent(undefined);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not save event");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await workspaceApi.deleteEvent(deleteTarget.id);
      setDeleteTarget(undefined);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not delete event");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Events are unavailable"} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Events"
        description="Plan and track events, assign volunteers, and manage budgets."
        actions={
          <Button renderIcon={Add} onClick={openCreateModal}>
            Add Event
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        selectable
        defaultSort={{ key: "startsAt", direction: "asc" }}
        pageSize={10}
      />

      <Modal
        title={editingEvent ? "Edit Event" : "Add Event"}
        description={editingEvent ? "Update event details." : "Create a new event."}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEvent(undefined);
        }}
      >
        <Form onSubmit={handleSave}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="evt-title"
              labelText="Title"
              required
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            />
            <TextInput
              id="evt-date"
              labelText="Date"
              type="date"
              required
              value={form.startsAt}
              onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
            />
            {createError ? (
              <p
                style={{
                  borderLeft: "4px solid var(--cds-support-error)",
                  backgroundColor: "var(--cds-layer)",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "var(--cds-support-error)",
                }}
              >
                {createError}
              </p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <Button
                kind="secondary"
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingEvent(undefined);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : editingEvent ? "Save Changes" : "Create Event"}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete Event"
        description="This action cannot be undone."
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(undefined)}
      >
        <p style={{ marginBottom: "1rem", color: "var(--cds-text-secondary)" }}>
          Delete &quot;{deleteTarget?.title}&quot;?
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <Button kind="secondary" onClick={() => setDeleteTarget(undefined)}>
            Cancel
          </Button>
          <Button kind="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
