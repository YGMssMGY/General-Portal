import { useMemo, useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { Modal } from "../../components/Modal";
import { PageLayout } from "../../components/PageLayout/PageLayout";
import { ErrorState, LoadingState, EmptyState } from "../../components/StateViews";
import { SimpleBarChart } from "@carbon/charts-react";
import "@carbon/charts/styles.css";
import {
    Button,
    TextInput,
    NumberInput,
    Form,
    Grid,
    Column,
    Tile,
    ProgressBar,
    Tag,
} from "@carbon/react";
import { Add, Edit, TrashCan, Time, UserAvatar, StarFilled, Calendar } from "@carbon/icons-react";
import { workspaceApi } from "../../api/workspaceApi";
import { useVolunteerSlots } from "../../hooks/useWorkspaceResources";
import { useUIStore } from "../../stores/useUIStore";
import type { VolunteerSlot } from "../../types";
import { formatDate } from "../../utils/format";

function getSlotStatus(slot: VolunteerSlot): "Full" | "Checked In" | "Registered" {
    if (slot.filled >= slot.capacity) return "Full";
    if (new Date(slot.startsAt) < new Date()) return "Checked In";
    return "Registered";
}

const statusColorMap: Record<string, "blue" | "green" | "gray"> = {
    Registered: "blue",
    "Checked In": "green",
    Full: "gray",
};

export function VolunteersPage() {
    const portal = useUIStore((s) => s.portal) || "developers";
    const { data, error, isLoading, refetch } = useVolunteerSlots();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSlot, setEditingSlot] = useState<VolunteerSlot>();
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string>();
    const [deleteTarget, setDeleteTarget] = useState<VolunteerSlot>();
    const [isDeleting, setIsDeleting] = useState(false);
    const [stats, setStats] = useState<{
        totalHoursThisMonth: number;
        activeVolunteers: number;
        topContributor: { name: string; hours: number };
    } | null>(null);
    const [form, setForm] = useState({
        title: "",
        eventName: "",
        capacity: 1,
        filled: 0,
        startsAt: new Date().toISOString().slice(0, 10),
        hours: 0,
    });

    useEffect(() => {
        workspaceApi
            .getVolunteerStats()
            .then(setStats)
            .catch(() => setStats(null));
    }, []);

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
                render: (slot) => {
                    const pct =
                        slot.capacity > 0 ? Math.round((slot.filled / slot.capacity) * 100) : 0;
                    return (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                minWidth: "140px",
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    height: "8px",
                                    background: "var(--cds-layer)",
                                    borderRadius: "4px",
                                    overflow: "hidden",
                                }}
                            >
                                <div
                                    style={{
                                        width: `${pct}%`,
                                        height: "100%",
                                        background:
                                            pct >= 100
                                                ? "var(--cds-support-error)"
                                                : pct >= 75
                                                  ? "var(--cds-support-warning)"
                                                  : "var(--cds-support-success)",
                                        borderRadius: "4px",
                                        transition: "width 0.3s ease",
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 500,
                                    color: "var(--cds-text-secondary)",
                                    whiteSpace: "nowrap",
                                }}
                            >
                                {slot.filled}/{slot.capacity}
                            </span>
                        </div>
                    );
                },
            },
            { key: "hours", header: "Hours", sortable: true, className: "text-right" },
            {
                key: "status",
                header: "Status",
                sortable: false,
                render: (slot) => {
                    const status = getSlotStatus(slot);
                    return <Tag type={statusColorMap[status]}>{status}</Tag>;
                },
            },
            {
                key: "actions",
                header: "",
                render: (slot) => (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Button
                            kind="ghost"
                            type="button"
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
                            type="button"
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
        [],
    );

    const totalFilled = data?.reduce((s, slot) => s + slot.filled, 0) ?? 0;
    const totalHours = data?.reduce((s, slot) => s + slot.hours * slot.filled, 0) ?? 0;

    const upcomingSlots = useMemo(
        () =>
            (data ?? [])
                .filter((s) => new Date(s.startsAt) >= new Date())
                .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
                .slice(0, 4),
        [data],
    );

    const hoursByMember = useMemo(() => {
        const map = new Map<string, number>();
        for (const slot of data ?? []) {
            const key = slot.eventName;
            map.set(key, (map.get(key) ?? 0) + slot.hours * slot.filled);
        }
        return Array.from(map.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([name, hours]) => ({ name, hours }));
    }, [data]);

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
                toast.success("Volunteer slot updated");
            } else {
                await workspaceApi.createVolunteerSlot(form);
                toast.success("Volunteer slot created");
            }
            setIsModalOpen(false);
            setEditingSlot(undefined);
            refetch();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not save slot";
            setCreateError(msg);
            toast.error(msg);
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
            toast.success("Volunteer slot deleted");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not delete slot";
            setCreateError(msg);
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    }

    if (isLoading) return <LoadingState />;
    if (error || !data)
        return <ErrorState message={error ?? "Volunteer data unavailable"} onRetry={refetch} />;
    if (data.length === 0)
        return (
            <EmptyState
                title="No volunteer slots"
                description="Volunteer slots will appear here once created."
                action={
                    <Button type="button" renderIcon={Add} onClick={openCreateModal}>
                        Create Slot
                    </Button>
                }
            />
        );

    return (
        <div>
            <Link
                to={`/${portal}/dashboard`}
                style={{
                    fontSize: "0.8125rem",
                    color: "var(--cds-link-primary)",
                    textDecoration: "none",
                    display: "inline-block",
                    marginBottom: "0.75rem",
                }}
            >
                &larr; Back to Dashboard
            </Link>
            <PageLayout
                title="Volunteers"
                description="Manage volunteer slots, sign-ups, and hours."
                actions={
                    <Button type="button" renderIcon={Add} onClick={openCreateModal}>
                        Add Slot
                    </Button>
                }
            >
                <Grid style={{ marginBottom: "1.5rem" }}>
                    <Column lg={4} md={4} sm={4}>
                        <Tile
                            style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: "0.75rem",
                                    right: "0.75rem",
                                    opacity: 0.12,
                                }}
                            >
                                <Time size={48} />
                            </div>
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.025em",
                                    color: "var(--cds-text-secondary)",
                                }}
                            >
                                Total Hours This Month
                            </p>
                            <p
                                style={{
                                    marginTop: "0.5rem",
                                    fontSize: "1.875rem",
                                    fontWeight: 600,
                                    color: "var(--cds-text-primary)",
                                }}
                            >
                                {stats?.totalHoursThisMonth ?? totalHours}
                                <span
                                    style={{
                                        fontSize: "0.875rem",
                                        fontWeight: 400,
                                        color: "var(--cds-text-secondary)",
                                        marginLeft: "0.5rem",
                                    }}
                                >
                                    hrs
                                </span>
                            </p>
                        </Tile>
                    </Column>
                    <Column lg={4} md={4} sm={4}>
                        <Tile
                            style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: "0.75rem",
                                    right: "0.75rem",
                                    opacity: 0.12,
                                }}
                            >
                                <UserAvatar size={48} />
                            </div>
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.025em",
                                    color: "var(--cds-text-secondary)",
                                }}
                            >
                                Active Volunteers
                            </p>
                            <p
                                style={{
                                    marginTop: "0.5rem",
                                    fontSize: "1.875rem",
                                    fontWeight: 600,
                                    color: "var(--cds-text-primary)",
                                }}
                            >
                                {stats?.activeVolunteers ?? totalFilled}
                            </p>
                        </Tile>
                    </Column>
                    <Column lg={4} md={4} sm={4}>
                        <Tile
                            style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}
                        >
                            <div
                                style={{
                                    position: "absolute",
                                    top: "0.75rem",
                                    right: "0.75rem",
                                    opacity: 0.12,
                                }}
                            >
                                <StarFilled size={48} />
                            </div>
                            <p
                                style={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.025em",
                                    color: "var(--cds-text-secondary)",
                                }}
                            >
                                Top Contributor
                            </p>
                            <p
                                style={{
                                    marginTop: "0.5rem",
                                    fontSize: "1.875rem",
                                    fontWeight: 600,
                                    color: "var(--cds-text-primary)",
                                }}
                            >
                                {stats?.topContributor?.name ?? "—"}
                            </p>
                            {stats?.topContributor ? (
                                <p
                                    style={{
                                        fontSize: "0.75rem",
                                        color: "var(--cds-text-secondary)",
                                        marginTop: "0.25rem",
                                    }}
                                >
                                    {stats.topContributor.hours} hours contributed
                                </p>
                            ) : null}
                        </Tile>
                    </Column>
                </Grid>

                <Grid>
                    <Column lg={12} md={8} sm={4}>
                        {upcomingSlots.length > 0 ? (
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h2
                                    style={{
                                        fontSize: "1rem",
                                        fontWeight: 600,
                                        color: "var(--cds-text-primary)",
                                        marginBottom: "0.75rem",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.5rem",
                                    }}
                                >
                                    <Calendar size={20} />
                                    Upcoming Slots
                                </h2>
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fill, minmax(240px, 1fr))",
                                        gap: "0.75rem",
                                    }}
                                >
                                    {upcomingSlots.map((slot) => {
                                        const pct =
                                            slot.capacity > 0
                                                ? Math.round((slot.filled / slot.capacity) * 100)
                                                : 0;
                                        return (
                                            <Tile key={slot.id} style={{ padding: "1.25rem" }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        alignItems: "flex-start",
                                                        marginBottom: "0.75rem",
                                                    }}
                                                >
                                                    <div>
                                                        <p
                                                            style={{
                                                                fontWeight: 600,
                                                                color: "var(--cds-text-primary)",
                                                                fontSize: "0.875rem",
                                                            }}
                                                        >
                                                            {slot.title}
                                                        </p>
                                                        <p
                                                            style={{
                                                                fontSize: "0.75rem",
                                                                color: "var(--cds-text-secondary)",
                                                                marginTop: "0.125rem",
                                                            }}
                                                        >
                                                            {slot.eventName}
                                                        </p>
                                                    </div>
                                                    <Tag
                                                        type={
                                                            pct >= 100
                                                                ? "red"
                                                                : pct >= 75
                                                                  ? "warm-gray"
                                                                  : "green"
                                                        }
                                                    >
                                                        {slot.filled}/{slot.capacity}
                                                    </Tag>
                                                </div>
                                                <ProgressBar
                                                    value={slot.filled}
                                                    max={slot.capacity || 1}
                                                    label="Capacity"
                                                    hideLabel
                                                    size="small"
                                                />
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        marginTop: "0.5rem",
                                                        fontSize: "0.75rem",
                                                        color: "var(--cds-text-secondary)",
                                                    }}
                                                >
                                                    <span>{formatDate(slot.startsAt)}</span>
                                                    <span>{slot.hours}h each</span>
                                                </div>
                                            </Tile>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : null}

                        <DataTable
                            columns={columns}
                            data={data as unknown as Record<string, unknown>[]}
                            defaultSort={{ key: "startsAt", direction: "asc" }}
                            pageSize={10}
                        />
                    </Column>

                    <Column lg={4} md={8} sm={4}>
                        <Tile style={{ padding: "1.25rem" }}>
                            <h2
                                style={{
                                    fontSize: "1rem",
                                    fontWeight: 600,
                                    color: "var(--cds-text-primary)",
                                    marginBottom: "1rem",
                                }}
                            >
                                Hours by Activity
                            </h2>
                            {hoursByMember.length === 0 ? (
                                <p
                                    style={{
                                        fontSize: "0.875rem",
                                        color: "var(--cds-text-secondary)",
                                    }}
                                >
                                    No hours recorded yet.
                                </p>
                            ) : (
                                <SimpleBarChart
                                    data={hoursByMember.map((m) => ({
                                        group: "Hours",
                                        key: m.name,
                                        value: m.hours,
                                    }))}
                                    options={{
                                        axes: {
                                            bottom: { mapsTo: "key", visible: false },
                                            left: { mapsTo: "value", visible: false },
                                        },
                                        toolbar: { enabled: false },
                                        height: "200px",
                                        legend: { enabled: false },
                                    }}
                                />
                            )}
                        </Tile>
                    </Column>
                </Grid>
            </PageLayout>

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
                        <div
                            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
                        >
                            <NumberInput
                                id="slot-capacity"
                                label="Capacity"
                                value={form.capacity}
                                min={1}
                                onChange={(_e, { value }) =>
                                    setForm((c) => ({ ...c, capacity: Number(value) }))
                                }
                            />
                            <NumberInput
                                id="slot-hours"
                                label="Hours per Slot"
                                value={form.hours}
                                min={0}
                                onChange={(_e, { value }) =>
                                    setForm((c) => ({ ...c, hours: Number(value) }))
                                }
                            />
                        </div>
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
                        <div
                            style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}
                        >
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
                                {isCreating
                                    ? "Saving..."
                                    : editingSlot
                                      ? "Save Changes"
                                      : "Create Slot"}
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
                    <Button
                        kind="secondary"
                        type="button"
                        onClick={() => setDeleteTarget(undefined)}
                    >
                        Cancel
                    </Button>
                    <Button
                        kind="danger"
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
