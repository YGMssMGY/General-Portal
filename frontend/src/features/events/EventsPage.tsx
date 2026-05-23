import { useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { DataTable } from "../../components/DataTable/DataTable";
import type { ColumnDef } from "../../components/DataTable/DataTable";
import { PageLayout } from "../../components/PageLayout/PageLayout";
import { ErrorState, LoadingState, EmptyState } from "../../components/StateViews";
import { Modal } from "../../components/Modal";
import { useUIStore } from "../../stores/useUIStore";
import {
    Button,
    TextInput,
    Form,
    Tag,
    Tile,
    Stack,
    Grid,
    Column,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    InlineNotification,
} from "@carbon/react";
import { MultiMemberSelect } from "../../components/MemberSelect/MultiMemberSelect";
import { workspaceApi } from "../../api/workspaceApi";
import { useEvents } from "../../hooks/useWorkspaceResources";
import type { EventItem } from "../../types";
import { formatCurrency, formatDate } from "../../utils/format";
import { Add, Edit, TrashCan, Calendar, User, Close } from "@carbon/icons-react";

const statusTagColors: Record<string, string> = {
    active: "green",
    draft: "blue",
    completed: "gray",
    pending: "blue",
};

export function EventsPage() {
    const portal = useUIStore((s) => s.portal) || "developers";
    const { data, error, isLoading, refetch } = useEvents();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventItem>();
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string>();
    const [deleteTarget, setDeleteTarget] = useState<EventItem>();
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedEventId, setSelectedEventId] = useState<string>();
    const [selectedTab, setSelectedTab] = useState(0);

    const [form, setForm] = useState({
        title: "",
        status: "pending",
        startsAt: new Date().toISOString().slice(0, 10),
        endsAt: new Date().toISOString().slice(0, 10),
        progress: 0,
        budgetTotal: 0,
        owners: "",
        ownerIds: [] as string[],
    });

    const upcoming = useMemo(() => {
        if (!data) return [];
        return [...data]
            .filter((e) => e.status === "active" || e.status === "pending")
            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
            .slice(0, 3);
    }, [data]);

    const columns: ColumnDef<EventItem>[] = useMemo(
        () => [
            { key: "title", header: "Title", sortable: true },
            {
                key: "startsAt",
                header: "Date",
                sortable: true,
                render: (event) => formatDate(event.startsAt),
            },
            {
                key: "status",
                header: "Status",
                sortable: true,
                render: (event) => (
                    <Tag
                        type={
                            (statusTagColors[event.status] || "gray") as "green" | "blue" | "gray"
                        }
                    >
                        {(event.status || "").charAt(0).toUpperCase() +
                            (event.status || "").slice(1)}
                    </Tag>
                ),
            },
            {
                key: "owners",
                header: "Coordinator",
                sortable: true,
                render: (event) => event.owners?.[0]?.ownerLabel || "-",
            },
            {
                key: "budgetTotal",
                header: "Budget",
                sortable: true,
                render: (event) => formatCurrency(event.budgetTotal || 0),
                className: "text-right",
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
                    <Stack orientation="horizontal" gap={3}>
                        <Button
                            kind="ghost"
                            type="button"
                            size="sm"
                            renderIcon={Edit}
                            iconDescription="Edit"
                            hasIconOnly
                            onClick={() => {
                                setEditingEvent(event);
                                setForm({
                                    title: event.title,
                                    status: event.status,
                                    startsAt: event.startsAt?.slice(0, 10) ?? "",
                                    endsAt: event.endsAt?.slice(0, 10) ?? "",
                                    progress: event.progress,
                                    budgetTotal: event.budgetTotal,
                                    owners: event.owners?.map((o) => o.ownerLabel).join(", ") ?? "",
                                    ownerIds:
                                        event.owners
                                            ?.map((o) => o.userId ?? o.id)
                                            .filter(Boolean) ?? [],
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
                            onClick={() => setDeleteTarget(event)}
                        />
                    </Stack>
                ),
            },
        ],
        [],
    );

    const selectedEvent = useMemo(() => {
        if (!data) return undefined;
        return data.find((e) => e.id === selectedEventId);
    }, [data, selectedEventId]);

    function openCreateModal() {
        setEditingEvent(undefined);
        setForm({
            title: "",
            status: "pending",
            startsAt: new Date().toISOString().slice(0, 10),
            endsAt: new Date().toISOString().slice(0, 10),
            progress: 0,
            budgetTotal: 0,
            owners: "",
            ownerIds: [],
        });
        setIsModalOpen(true);
    }

    async function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreateError(undefined);
        setIsCreating(true);
        try {
            const base = {
                title: form.title,
                startsAt: form.startsAt,
                status: form.status,
            };
            const updates: Record<string, unknown> = {
                ...base,
                endsAt: form.endsAt || undefined,
                progress: form.progress,
                budgetTotal: form.budgetTotal,
                owners: form.owners ? form.owners.split(",").map((s) => s.trim()) : [],
                ownerIds: form.ownerIds.length > 0 ? form.ownerIds : undefined,
            };
            if (editingEvent) {
                await workspaceApi.updateEvent(editingEvent.id, updates);
                toast.success("Event updated");
            } else {
                await workspaceApi.createEvent(
                    base as Pick<EventItem, "title" | "startsAt" | "status">,
                );
                toast.success("Event created");
            }
            setIsModalOpen(false);
            setEditingEvent(undefined);
            refetch();
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not save event";
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
            await workspaceApi.deleteEvent(deleteTarget.id);
            setDeleteTarget(undefined);
            refetch();
            toast.success("Event deleted");
        } catch (e) {
            const msg = e instanceof Error ? e.message : "Could not delete event";
            setCreateError(msg);
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    }

    if (isLoading) return <LoadingState />;
    if (error || !data)
        return <ErrorState message={error ?? "Events are unavailable"} onRetry={refetch} />;
    if (data.length === 0)
        return (
            <EmptyState
                title="No events"
                description="Events will appear here once created."
                action={
                    <Button type="button" renderIcon={Add} onClick={openCreateModal}>
                        Create Event
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
                title="Events"
                description="Plan and track events, assign volunteers, and manage budgets."
                actions={
                    <Button type="button" renderIcon={Add} onClick={openCreateModal}>
                        Add Event
                    </Button>
                }
            >
                {upcoming.length > 0 ? (
                    <Grid style={{ marginBottom: "1rem" }}>
                        {upcoming.map((event) => (
                            <Column lg={8} md={8} sm={4} key={event.id}>
                                <Tile style={{ padding: "1.5rem" }}>
                                    <Stack gap={5}>
                                        <Stack
                                            orientation="horizontal"
                                            gap={5}
                                            style={{
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <div>
                                                <Tag
                                                    type={
                                                        (statusTagColors[event.status] ||
                                                            "gray") as "green" | "blue" | "gray"
                                                    }
                                                >
                                                    {event.status.charAt(0).toUpperCase() +
                                                        event.status.slice(1)}
                                                </Tag>
                                                <h3
                                                    style={{
                                                        marginTop: "0.5rem",
                                                        fontSize: "1rem",
                                                        fontWeight: 600,
                                                        color: "var(--cds-text-primary)",
                                                    }}
                                                >
                                                    {event.title}
                                                </h3>
                                                <p
                                                    style={{
                                                        fontSize: "0.875rem",
                                                        color: "var(--cds-text-secondary)",
                                                        marginTop: "0.25rem",
                                                    }}
                                                >
                                                    {formatDate(event.startsAt)}
                                                </p>
                                            </div>
                                            <Calendar
                                                size={20}
                                                style={{
                                                    color: "var(--cds-text-secondary)",
                                                    flexShrink: 0,
                                                }}
                                                aria-hidden="true"
                                            />
                                        </Stack>

                                        <div>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    marginBottom: "0.25rem",
                                                    fontSize: "0.75rem",
                                                }}
                                            >
                                                <span
                                                    style={{ color: "var(--cds-text-secondary)" }}
                                                >
                                                    Progress
                                                </span>
                                                <span
                                                    style={{
                                                        fontWeight: 500,
                                                        color: "var(--cds-text-primary)",
                                                    }}
                                                >
                                                    {event.progress}%
                                                </span>
                                            </div>
                                            <div
                                                style={{
                                                    height: "0.5rem",
                                                    borderRadius: "4px",
                                                    background: "var(--cds-layer-active)",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        width: `${event.progress}%`,
                                                        height: "100%",
                                                        borderRadius: "4px",
                                                        background: "var(--cds-support-success)",
                                                        transition: "width 0.3s ease",
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <Stack
                                            orientation="horizontal"
                                            gap={5}
                                            style={{ justifyContent: "space-between" }}
                                        >
                                            <div style={{ fontSize: "0.875rem" }}>
                                                <p style={{ color: "var(--cds-text-secondary)" }}>
                                                    Budget
                                                </p>
                                                <p
                                                    style={{
                                                        fontWeight: 500,
                                                        color: "var(--cds-text-primary)",
                                                    }}
                                                >
                                                    {formatCurrency(event.budgetUsed ?? 0)} /{" "}
                                                    {formatCurrency(event.budgetTotal ?? 0)}
                                                </p>
                                            </div>
                                            {event.owners?.length > 0 ? (
                                                <Stack
                                                    orientation="horizontal"
                                                    gap={3}
                                                    style={{ alignItems: "center" }}
                                                >
                                                    <User
                                                        size={16}
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                    <span
                                                        style={{
                                                            fontSize: "0.875rem",
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        {event.owners[0].ownerLabel}
                                                    </span>
                                                </Stack>
                                            ) : null}
                                        </Stack>
                                    </Stack>
                                </Tile>
                            </Column>
                        ))}
                    </Grid>
                ) : null}

                <DataTable
                    columns={columns}
                    data={data as unknown as Record<string, unknown>[]}
                    defaultSort={{ key: "startsAt", direction: "asc" }}
                    pageSize={10}
                    onRowClick={(item) => {
                        setSelectedEventId((prev) => (prev === item.id ? undefined : item.id));
                    }}
                />

                {/* Detail Drawer */}
                {selectedEvent ? (
                    <div
                        style={{
                            position: "fixed",
                            inset: 0,
                            zIndex: 9000,
                            display: "flex",
                            justifyContent: "flex-end",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: 0,
                                background: "rgba(0,0,0,0.3)",
                            }}
                            onClick={() => setSelectedEventId(undefined)}
                        />
                        <Tile
                            style={{
                                position: "relative",
                                width: "480px",
                                maxWidth: "100vw",
                                height: "100vh",
                                overflowY: "auto",
                                padding: "1.5rem",
                                borderRadius: 0,
                                boxShadow: "-4px 0 12px rgba(0,0,0,0.1)",
                            }}
                        >
                            <Stack gap={4}>
                                <Stack
                                    orientation="horizontal"
                                    gap={4}
                                    style={{
                                        justifyContent: "space-between",
                                        alignItems: "flex-start",
                                    }}
                                >
                                    <Tag
                                        type={
                                            (statusTagColors[selectedEvent.status] || "gray") as
                                                | "green"
                                                | "blue"
                                                | "gray"
                                        }
                                    >
                                        {selectedEvent.status.charAt(0).toUpperCase() +
                                            selectedEvent.status.slice(1)}
                                    </Tag>
                                    <Button
                                        kind="ghost"
                                        type="button"
                                        size="sm"
                                        renderIcon={Close}
                                        iconDescription="Close"
                                        hasIconOnly
                                        onClick={() => setSelectedEventId(undefined)}
                                    />
                                </Stack>

                                <div>
                                    <h2
                                        style={{
                                            fontSize: "1.25rem",
                                            fontWeight: 600,
                                            color: "var(--cds-text-primary)",
                                        }}
                                    >
                                        {selectedEvent.title}
                                    </h2>
                                    <p
                                        style={{
                                            fontSize: "0.875rem",
                                            color: "var(--cds-text-secondary)",
                                            marginTop: "0.25rem",
                                        }}
                                    >
                                        {formatDate(selectedEvent.startsAt)}
                                    </p>
                                </div>

                                <Tabs
                                    selectedIndex={selectedTab}
                                    onChange={(state: { selectedIndex: number }) =>
                                        setSelectedTab(state.selectedIndex)
                                    }
                                >
                                    <TabList aria-label="Event details">
                                        <Tab>Overview</Tab>
                                        <Tab>Volunteers</Tab>
                                        <Tab>Budget</Tab>
                                    </TabList>
                                    <TabPanels>
                                        <TabPanel>
                                            <Stack gap={5} style={{ paddingTop: "1rem" }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        fontSize: "0.875rem",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Status
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color: "var(--cds-text-primary)",
                                                        }}
                                                    >
                                                        {selectedEvent.status
                                                            .charAt(0)
                                                            .toUpperCase() +
                                                            selectedEvent.status.slice(1)}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        fontSize: "0.875rem",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Date
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color: "var(--cds-text-primary)",
                                                        }}
                                                    >
                                                        {formatDate(selectedEvent.startsAt)}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        fontSize: "0.875rem",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Budget
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color: "var(--cds-text-primary)",
                                                        }}
                                                    >
                                                        {formatCurrency(
                                                            selectedEvent.budgetTotal ?? 0,
                                                        )}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            justifyContent: "space-between",
                                                            marginBottom: "0.25rem",
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                color: "var(--cds-text-secondary)",
                                                            }}
                                                        >
                                                            Progress
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontWeight: 500,
                                                                color: "var(--cds-text-primary)",
                                                            }}
                                                        >
                                                            {selectedEvent.progress}%
                                                        </span>
                                                    </div>
                                                    <div
                                                        style={{
                                                            height: "0.5rem",
                                                            borderRadius: "4px",
                                                            background: "var(--cds-layer-active)",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                width: `${selectedEvent.progress}%`,
                                                                height: "100%",
                                                                borderRadius: "4px",
                                                                background:
                                                                    "var(--cds-support-success)",
                                                                transition: "width 0.3s ease",
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </Stack>
                                        </TabPanel>
                                        <TabPanel>
                                            <Stack gap={4} style={{ paddingTop: "1rem" }}>
                                                <p
                                                    style={{
                                                        fontSize: "0.875rem",
                                                        fontWeight: 600,
                                                        color: "var(--cds-text-primary)",
                                                    }}
                                                >
                                                    Coordinators
                                                </p>
                                                {selectedEvent.owners?.length > 0 ? (
                                                    selectedEvent.owners.map((owner, i) => (
                                                        <Stack
                                                            key={i}
                                                            orientation="horizontal"
                                                            gap={3}
                                                            style={{ alignItems: "center" }}
                                                        >
                                                            <User
                                                                size={16}
                                                                style={{
                                                                    color: "var(--cds-text-secondary)",
                                                                }}
                                                                aria-hidden="true"
                                                            />
                                                            <span
                                                                style={{
                                                                    fontSize: "0.875rem",
                                                                    color: "var(--cds-text-primary)",
                                                                }}
                                                            >
                                                                {owner.ownerLabel}
                                                            </span>
                                                        </Stack>
                                                    ))
                                                ) : (
                                                    <p
                                                        style={{
                                                            fontSize: "0.875rem",
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        No coordinators assigned
                                                    </p>
                                                )}
                                            </Stack>
                                        </TabPanel>
                                        <TabPanel>
                                            <Stack gap={4} style={{ paddingTop: "1rem" }}>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        fontSize: "0.875rem",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Total Budget
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color: "var(--cds-text-primary)",
                                                        }}
                                                    >
                                                        {formatCurrency(
                                                            selectedEvent.budgetTotal ?? 0,
                                                        )}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        fontSize: "0.875rem",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Used
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color: "var(--cds-text-primary)",
                                                        }}
                                                    >
                                                        {formatCurrency(
                                                            selectedEvent.budgetUsed ?? 0,
                                                        )}
                                                    </span>
                                                </div>
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        justifyContent: "space-between",
                                                        fontSize: "0.875rem",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            color: "var(--cds-text-secondary)",
                                                        }}
                                                    >
                                                        Remaining
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontWeight: 500,
                                                            color: "var(--cds-support-success)",
                                                        }}
                                                    >
                                                        {formatCurrency(
                                                            (selectedEvent.budgetTotal ?? 0) -
                                                                (selectedEvent.budgetUsed ?? 0),
                                                        )}
                                                    </span>
                                                </div>
                                            </Stack>
                                        </TabPanel>
                                    </TabPanels>
                                </Tabs>
                            </Stack>
                        </Tile>
                    </div>
                ) : null}
            </PageLayout>

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
                    <Stack gap={5}>
                        <TextInput
                            id="evt-title"
                            labelText="Title"
                            required
                            value={form.title}
                            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                        />
                        <Grid>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="evt-owners"
                                    labelText="Coordinators (comma-separated names)"
                                    value={form.owners}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, owners: e.target.value }))
                                    }
                                />
                            </Column>
                            <Column lg={8} md={8} sm={4}>
                                <MultiMemberSelect
                                    value={form.ownerIds}
                                    onChange={(ids) => setForm((c) => ({ ...c, ownerIds: ids }))}
                                    label="Or select coordinators"
                                    placeholder="Search members..."
                                />
                            </Column>
                        </Grid>
                        <Grid>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="evt-start"
                                    labelText="Start Date"
                                    type="date"
                                    required
                                    value={form.startsAt}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, startsAt: e.target.value }))
                                    }
                                />
                            </Column>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="evt-end"
                                    labelText="End Date"
                                    type="date"
                                    value={form.endsAt}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, endsAt: e.target.value }))
                                    }
                                />
                            </Column>
                        </Grid>
                        <Grid>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="evt-budget"
                                    labelText="Total Budget"
                                    type="number"
                                    min={0}
                                    value={form.budgetTotal}
                                    onChange={(e) =>
                                        setForm((c) => ({
                                            ...c,
                                            budgetTotal: Number(e.target.value),
                                        }))
                                    }
                                />
                            </Column>
                            <Column lg={8} md={8} sm={4}>
                                <TextInput
                                    id="evt-owners-2"
                                    labelText="Coordinators (comma-separated)"
                                    value={form.owners}
                                    onChange={(e) =>
                                        setForm((c) => ({ ...c, owners: e.target.value }))
                                    }
                                />
                            </Column>
                        </Grid>
                        {createError ? (
                            <InlineNotification
                                kind="error"
                                subtitle={createError}
                                hideCloseButton
                                lowContrast
                            />
                        ) : null}
                        <Stack
                            orientation="horizontal"
                            gap={5}
                            style={{ justifyContent: "flex-end" }}
                        >
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
                                {isCreating
                                    ? "Saving..."
                                    : editingEvent
                                      ? "Save Changes"
                                      : "Create Event"}
                            </Button>
                        </Stack>
                    </Stack>
                </Form>
            </Modal>

            <Modal
                title="Delete Event"
                description="This action cannot be undone."
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(undefined)}
            >
                <Stack gap={5}>
                    <p style={{ color: "var(--cds-text-secondary)" }}>
                        Delete &quot;{deleteTarget?.title}&quot;?
                    </p>
                    <Stack orientation="horizontal" gap={5} style={{ justifyContent: "flex-end" }}>
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
                    </Stack>
                </Stack>
            </Modal>
        </div>
    );
}
