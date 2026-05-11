import { useMemo, useState, type FormEvent } from "react";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Card } from "../../components/Card";
import { Modal } from "../../components/Modal";
import { PageHeader } from "../../components/PageHeader";
import { ErrorState, LoadingState } from "../../components/StateViews";
import { Button, TextInput, Form, NumberInput } from "@carbon/react";
import { workspaceApi } from "../../api/workspaceApi";
import { useVolunteerSlots } from "../../hooks/useWorkspaceResources";
import type { VolunteerSlot } from "../../types";
import { formatDate } from "../../utils/format";
import { Add, Edit, TrashCan } from "@carbon/icons-react";

export function VolunteersPage() {
  const { data, error, isLoading, refetch } = useVolunteerSlots();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<VolunteerSlot>();
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<VolunteerSlot>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    eventName: "",
    capacity: 0,
    filled: 0,
    startsAt: "",
    hours: 0,
  });

  const columns: ColumnDef<VolunteerSlot>[] = useMemo(
    () => [
      { key: "title", header: "Title", sortable: true },
      { key: "eventName", header: "Event", sortable: true },
      {
        key: "startsAt",
        header: "Date",
        sortable: true,
        render: (slot) => formatDate(slot.startsAt),
      },
      {
        key: "filled",
        header: "Capacity",
        sortable: true,
        render: (slot) => (
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <NumberInput
              id={`cap-${slot.id}`}
              label=""
              hideLabel
              size="sm"
              value={slot.filled}
              min={0}
              max={slot.capacity}
              onChange={async (_e, { value }) => {
                try {
                  await workspaceApi.updateVolunteerSlot(slot.id, { filled: Number(value) });
                  refetch();
                } catch {}
              }}
              style={{ width: "80px" }}
            />
            <span
              style={{
                color:
                  slot.filled >= slot.capacity
                    ? "var(--cds-support-error)"
                    : "var(--cds-text-secondary)",
                fontSize: "0.875rem",
              }}
            >
              /{slot.capacity}
            </span>
          </div>
        ),
        className: "text-right",
      },
      { key: "hours", header: "Hours", sortable: true, className: "text-right" },
      {
        key: "actions",
        header: "",
        render: (slot) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Edit}
              iconDescription="Edit"
              hasIconOnly
              onClick={() => {
                setEditingSlot(slot);
                setForm({
                  title: slot.title,
                  eventName: slot.eventName,
                  capacity: slot.capacity,
                  filled: slot.filled,
                  startsAt: slot.startsAt?.slice(0, 10) ?? "",
                  hours: slot.hours,
                });
                setIsModalOpen(true);
              }}
            />
            <Button
              kind="ghost"
              size="sm"
              renderIcon={TrashCan}
              iconDescription="Delete"
              hasIconOnly
              onClick={() => setDeleteTarget(slot)}
            />
          </div>
        ),
      },
    ],
    [refetch],
  );

  function openCreateModal() {
    setEditingSlot(undefined);
    setForm({
      title: "",
      eventName: "",
      capacity: 1,
      filled: 0,
      startsAt: new Date().toISOString().slice(0, 10),
      hours: 0,
    });
    setIsModalOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(undefined);
    setIsCreating(true);
    try {
      if (editingSlot) {
        await workspaceApi.updateVolunteerSlot(editingSlot.id, form);
      } else {
        await workspaceApi.createVolunteerSlot(form);
      }
      setIsModalOpen(false);
      setEditingSlot(undefined);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not save slot");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await workspaceApi.deleteVolunteerSlot(deleteTarget.id);
      setDeleteTarget(undefined);
      refetch();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not delete slot");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) return <LoadingState />;
  if (error || !data)
    return <ErrorState message={error ?? "Volunteer data unavailable"} onRetry={refetch} />;
  const totalSlots = data.length;
  const totalFilled = data.reduce((s, slot) => s + slot.filled, 0);
  const totalHours = data.reduce((s, slot) => s + slot.hours * slot.filled, 0);

  return (
    <div>
      <PageHeader
        title="Volunteers"
        description="Manage volunteer slots, sign-ups, and hours."
        actions={
          <Button renderIcon={Add} onClick={openCreateModal}>
            Add Slot
          </Button>
        }
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <Card padding="lg">
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.025em",
              color: "var(--cds-text-secondary)",
            }}
          >
            Total Slots
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {totalSlots}
          </p>
        </Card>
        <Card padding="lg">
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.025em",
              color: "var(--cds-text-secondary)",
            }}
          >
            Filled
          </p>
          <p
            style={{ marginTop: "0.5rem", fontSize: "1.875rem", fontWeight: 600, color: "#0f62fe" }}
          >
            {totalFilled}
          </p>
        </Card>
        <Card padding="lg">
          <p
            style={{
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.025em",
              color: "var(--cds-text-secondary)",
            }}
          >
            Volunteer Hours
          </p>
          <p
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              color: "var(--cds-text-primary)",
            }}
          >
            {totalHours}
          </p>
        </Card>
      </div>
      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        defaultSort={{ key: "startsAt", direction: "asc" }}
        pageSize={10}
      />

      <Modal
        title={editingSlot ? "Edit Slot" : "Add Volunteer Slot"}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSlot(undefined);
        }}
      >
        <Form onSubmit={handleSave}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <TextInput
              id="slot-title"
              labelText="Role/Title"
              required
              value={form.title}
              onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            />
            <TextInput
              id="slot-event"
              labelText="Event Name"
              required
              value={form.eventName}
              onChange={(e) => setForm((c) => ({ ...c, eventName: e.target.value }))}
            />
            <TextInput
              id="slot-date"
              labelText="Date"
              type="date"
              required
              value={form.startsAt}
              onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <NumberInput
                id="slot-capacity"
                label="Capacity"
                value={form.capacity}
                min={1}
                onChange={(_e, { value }) => setForm((c) => ({ ...c, capacity: Number(value) }))}
              />
              <NumberInput
                id="slot-filled"
                label="Filled"
                value={form.filled}
                min={0}
                max={form.capacity}
                onChange={(_e, { value }) => setForm((c) => ({ ...c, filled: Number(value) }))}
              />
              <NumberInput
                id="slot-hours"
                label="Hours"
                value={form.hours}
                min={0}
                onChange={(_e, { value }) => setForm((c) => ({ ...c, hours: Number(value) }))}
              />
            </div>
            {createError ? (
              <p
                style={{
                  borderLeft: "4px solid var(--cds-support-error)",
                  backgroundColor: "#fff1f1",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.875rem",
                  color: "#a2191f",
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
                  setEditingSlot(undefined);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Saving..." : editingSlot ? "Save Changes" : "Create Slot"}
              </Button>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete Slot"
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
