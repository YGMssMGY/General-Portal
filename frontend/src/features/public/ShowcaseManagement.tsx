import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import {
    Button,
    DataTable,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableHeader,
    TableRow,
    TextInput,
    TextArea,
    Select,
    SelectItem,
    Tile,
    Stack,
    InlineNotification,
    Grid,
    Column,
    Row,
} from "@carbon/react";
import { Add, Edit, TrashCan, Image as ImageIcon } from "@carbon/icons-react";
import { PageHeader } from "../../components/PageHeader";
import { Modal } from "../../components/Modal";
import { workspaceApi } from "../../api/workspaceApi";
import type { PublicEvent, Photo } from "../../types";

function formatDate(dateStr?: string): string {
    if (!dateStr) return "";
    try {
        return new Date(dateStr).toLocaleDateString();
    } catch {
        return dateStr;
    }
}

export function ShowcaseManagement() {
    // Data state
    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Event form state
    const [eventModalOpen, setEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<PublicEvent | null>(null);
    const [eventForm, setEventForm] = useState({
        title: "",
        eventDate: "",
        description: "",
        category: "",
    });
    const [eventSaving, setEventSaving] = useState(false);
    const [eventError, setEventError] = useState<string | undefined>();

    // Photo form state
    const [photoModalOpen, setPhotoModalOpen] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
    const [photoForm, setPhotoForm] = useState({
        title: "",
        photoDate: "",
        description: "",
        imageUrl: "",
    });
    const [photoSaving, setPhotoSaving] = useState(false);
    const [photoError, setPhotoError] = useState<string | undefined>();

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<{
        type: "event" | "photo";
        id: string;
        title: string;
    } | null>(null);

    // Fetch data
    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const [eventsData, photosData] = await Promise.all([
                workspaceApi.getPublicEvents(),
                workspaceApi.getPhotos(),
            ]);
            setEvents(eventsData);
            setPhotos(photosData);
        } catch (err: any) {
            setError(err?.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    // ── Event CRUD ──

    function openAddEvent() {
        setEditingEvent(null);
        setEventForm({ title: "", eventDate: "", description: "", category: "" });
        setEventError(undefined);
        setEventModalOpen(true);
    }

    function openEditEvent(event: PublicEvent) {
        setEditingEvent(event);
        setEventForm({
            title: event.title,
            eventDate: event.eventDate || "",
            description: event.description || "",
            category: event.category || "",
        });
        setEventError(undefined);
        setEventModalOpen(true);
    }

    function closeEventModal() {
        setEventModalOpen(false);
        setEditingEvent(null);
        setEventForm({ title: "", eventDate: "", description: "", category: "" });
        setEventError(undefined);
    }

    async function handleSaveEvent(e: FormEvent) {
        e.preventDefault();
        setEventSaving(true);
        setEventError(undefined);
        try {
            const payload = {
                title: eventForm.title,
                eventDate: eventForm.eventDate || undefined,
                description: eventForm.description || undefined,
                category: eventForm.category || undefined,
            };
            if (editingEvent) {
                await workspaceApi.updatePublicEvent(editingEvent.id, payload);
                toast.success("Event updated");
            } else {
                await workspaceApi.createPublicEvent(payload as any);
                toast.success("Event created");
            }
            closeEventModal();
            await fetchData();
        } catch (err: any) {
            const msg = err?.message || "Failed to save event";
            setEventError(msg);
            toast.error(msg);
        } finally {
            setEventSaving(false);
        }
    }

    // ── Photo CRUD ──

    function openAddPhoto() {
        setEditingPhoto(null);
        setPhotoForm({ title: "", photoDate: "", description: "", imageUrl: "" });
        setPhotoError(undefined);
        setPhotoModalOpen(true);
    }

    function openEditPhoto(photo: Photo) {
        setEditingPhoto(photo);
        setPhotoForm({
            title: photo.title,
            photoDate: photo.photoDate || "",
            description: photo.description || "",
            imageUrl: photo.imageUrl || "",
        });
        setPhotoError(undefined);
        setPhotoModalOpen(true);
    }

    function closePhotoModal() {
        setPhotoModalOpen(false);
        setEditingPhoto(null);
        setPhotoForm({ title: "", photoDate: "", description: "", imageUrl: "" });
        setPhotoError(undefined);
    }

    async function handleSavePhoto(e: FormEvent) {
        e.preventDefault();
        setPhotoSaving(true);
        setPhotoError(undefined);
        try {
            const payload = {
                title: photoForm.title,
                photoDate: photoForm.photoDate || undefined,
                description: photoForm.description || undefined,
                imageUrl: photoForm.imageUrl || undefined,
            };
            if (editingPhoto) {
                await workspaceApi.updatePhoto(editingPhoto.id, payload);
                toast.success("Photo updated");
            } else {
                await workspaceApi.createPhoto(payload as any);
                toast.success("Photo created");
            }
            closePhotoModal();
            await fetchData();
        } catch (err: any) {
            const msg = err?.message || "Failed to save photo";
            setPhotoError(msg);
            toast.error(msg);
        } finally {
            setPhotoSaving(false);
        }
    }

    // ── Delete ──

    async function handleDelete() {
        if (!deleteTarget) return;
        try {
            if (deleteTarget.type === "event") {
                await workspaceApi.deletePublicEvent(deleteTarget.id);
                toast.success("Event deleted");
            } else {
                await workspaceApi.deletePhoto(deleteTarget.id);
                toast.success("Photo deleted");
            }
            setDeleteTarget(null);
            await fetchData();
        } catch (err: any) {
            toast.error(err?.message || "Failed to delete");
        }
    }

    // ── DataTable headers ──

    const eventHeaders = [
        { key: "title", header: "Title" },
        { key: "eventDate", header: "Date" },
        { key: "category", header: "Category" },
        { key: "description", header: "Description" },
        { key: "actions", header: "Actions" },
    ];

    const eventRows = events.map((event) => ({
        id: event.id,
        title: event.title,
        eventDate: formatDate(event.eventDate),
        category: event.category || "\u2014",
        description: event.description || "\u2014",
        actions: (
            <div style={{ display: "flex", gap: "0.25rem" }}>
                <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={Edit}
                    iconDescription="Edit"
                    hasIconOnly
                    type="button"
                    onClick={() => openEditEvent(event)}
                />
                <Button
                    kind="ghost"
                    size="sm"
                    renderIcon={TrashCan}
                    iconDescription="Delete"
                    hasIconOnly
                    type="button"
                    onClick={() =>
                        setDeleteTarget({
                            type: "event",
                            id: event.id,
                            title: event.title,
                        })
                    }
                />
            </div>
        ),
    }));

    // ── Render ──

    if (loading && events.length === 0 && photos.length === 0) {
        return (
            <div>
                <PageHeader
                    title="Showcase Management"
                    description="Manage public events and photo gallery content."
                />
                <div
                    style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "var(--cds-text-secondary)",
                    }}
                >
                    Loading...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <PageHeader
                    title="Showcase Management"
                    description="Manage public events and photo gallery content."
                />
                <InlineNotification kind="error" subtitle={error} hideCloseButton lowContrast />
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title="Showcase Management"
                description="Manage public events and photo gallery content."
            />

            {/* Tabs using inline toggle pattern */}
            <div>
                {/* Events Section */}
                <div style={{ marginBottom: "2rem" }}>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "1rem",
                        }}
                    >
                        <h2
                            className="cds--productive-heading-02"
                            style={{ color: "var(--cds-text-primary)" }}
                        >
                            Public Events
                        </h2>
                        <Button type="button" size="sm" renderIcon={Add} onClick={openAddEvent}>
                            Add Event
                        </Button>
                    </div>

                    {events.length === 0 ? (
                        <Tile>
                            <p style={{ color: "var(--cds-text-secondary)" }}>
                                No public events yet. Click "Add Event" to create one.
                            </p>
                        </Tile>
                    ) : (
                        <TableContainer title="">
                            <DataTable
                                rows={eventRows}
                                headers={eventHeaders}
                                render={({ rows, headers, getHeaderProps, getRowProps }: any) => (
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                {headers.map((header: any) => (
                                                    <TableHeader
                                                        key={header.key}
                                                        {...getHeaderProps({ header })}
                                                    >
                                                        {header.header}
                                                    </TableHeader>
                                                ))}
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((row: any) => (
                                                <TableRow key={row.id} {...getRowProps({ row })}>
                                                    {row.cells.map((cell: any) => (
                                                        <TableCell key={cell.id}>
                                                            {cell.value}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            />
                        </TableContainer>
                    )}
                </div>

                {/* Photos Section */}
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "1rem",
                        }}
                    >
                        <h2
                            className="cds--productive-heading-02"
                            style={{ color: "var(--cds-text-primary)" }}
                        >
                            Photos
                        </h2>
                        <Button type="button" size="sm" renderIcon={Add} onClick={openAddPhoto}>
                            Add Photo
                        </Button>
                    </div>

                    {photos.length === 0 ? (
                        <Tile>
                            <p style={{ color: "var(--cds-text-secondary)" }}>
                                No photos yet. Click "Add Photo" to upload one.
                            </p>
                        </Tile>
                    ) : (
                        <Grid fullWidth>
                            <Row>
                                {photos.map((photo) => (
                                    <Column
                                        key={photo.id}
                                        sm={4}
                                        md={4}
                                        lg={4}
                                        style={{ marginBottom: "1rem" }}
                                    >
                                        <Tile>
                                            <div
                                                style={{
                                                    aspectRatio: "4/3",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    background: "var(--cds-layer-accent)",
                                                    marginBottom: "0.75rem",
                                                    overflow: "hidden",
                                                    borderRadius: "4px",
                                                }}
                                            >
                                                {photo.imageUrl ? (
                                                    <img
                                                        src={photo.imageUrl}
                                                        alt={photo.title}
                                                        style={{
                                                            width: "100%",
                                                            height: "100%",
                                                            objectFit: "cover",
                                                        }}
                                                    />
                                                ) : (
                                                    <ImageIcon
                                                        size={40}
                                                        style={{
                                                            color: "var(--cds-text-placeholder)",
                                                        }}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </div>
                                            <p
                                                style={{
                                                    fontSize: "0.875rem",
                                                    fontWeight: 500,
                                                    color: "var(--cds-text-primary)",
                                                    marginBottom: "0.125rem",
                                                }}
                                            >
                                                {photo.title}
                                            </p>
                                            <p
                                                style={{
                                                    fontSize: "0.75rem",
                                                    color: "var(--cds-text-placeholder)",
                                                    marginBottom: "0.75rem",
                                                }}
                                            >
                                                {formatDate(photo.photoDate)}
                                            </p>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    gap: "0.25rem",
                                                }}
                                            >
                                                <Button
                                                    kind="ghost"
                                                    size="sm"
                                                    renderIcon={Edit}
                                                    iconDescription="Edit"
                                                    hasIconOnly
                                                    type="button"
                                                    onClick={() => openEditPhoto(photo)}
                                                />
                                                <Button
                                                    kind="ghost"
                                                    size="sm"
                                                    renderIcon={TrashCan}
                                                    iconDescription="Delete"
                                                    hasIconOnly
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteTarget({
                                                            type: "photo",
                                                            id: photo.id,
                                                            title: photo.title,
                                                        })
                                                    }
                                                />
                                            </div>
                                        </Tile>
                                    </Column>
                                ))}
                            </Row>
                        </Grid>
                    )}
                </div>
            </div>

            {/* ── Event Modal ── */}
            <Modal
                title={editingEvent ? "Edit Event" : "Add Event"}
                isOpen={eventModalOpen}
                onClose={closeEventModal}
            >
                <form onSubmit={handleSaveEvent}>
                    <Stack gap={5}>
                        <TextInput
                            id="event-title"
                            labelText="Title"
                            required
                            value={eventForm.title}
                            onChange={(e) =>
                                setEventForm((p) => ({
                                    ...p,
                                    title: e.target.value,
                                }))
                            }
                        />
                        <TextInput
                            id="event-date"
                            labelText="Event Date"
                            type="date"
                            value={eventForm.eventDate}
                            onChange={(e) =>
                                setEventForm((p) => ({
                                    ...p,
                                    eventDate: e.target.value,
                                }))
                            }
                        />
                        <TextArea
                            id="event-description"
                            labelText="Description"
                            value={eventForm.description}
                            onChange={(e) =>
                                setEventForm((p) => ({
                                    ...p,
                                    description: e.target.value,
                                }))
                            }
                            rows={3}
                        />
                        <Select
                            id="event-category"
                            labelText="Category"
                            value={eventForm.category}
                            onChange={(e) =>
                                setEventForm((p) => ({
                                    ...p,
                                    category: e.target.value,
                                }))
                            }
                        >
                            <SelectItem value="" text="Select category" />
                            <SelectItem value="Workshop" text="Workshop" />
                            <SelectItem value="Social" text="Social" />
                            <SelectItem value="Fundraiser" text="Fundraiser" />
                            <SelectItem value="Meeting" text="Meeting" />
                            <SelectItem value="Community" text="Community" />
                            <SelectItem value="Other" text="Other" />
                        </Select>
                        {eventError ? (
                            <InlineNotification
                                kind="error"
                                subtitle={eventError}
                                hideCloseButton
                                lowContrast
                            />
                        ) : null}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "0.75rem",
                            }}
                        >
                            <Button kind="secondary" type="button" onClick={closeEventModal}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={eventSaving || !eventForm.title.trim()}>
                                {editingEvent ? "Save" : "Create"}
                            </Button>
                        </div>
                    </Stack>
                </form>
            </Modal>

            {/* ── Photo Modal ── */}
            <Modal
                title={editingPhoto ? "Edit Photo" : "Add Photo"}
                isOpen={photoModalOpen}
                onClose={closePhotoModal}
            >
                <form onSubmit={handleSavePhoto}>
                    <Stack gap={5}>
                        <TextInput
                            id="photo-title"
                            labelText="Title"
                            required
                            value={photoForm.title}
                            onChange={(e) =>
                                setPhotoForm((p) => ({
                                    ...p,
                                    title: e.target.value,
                                }))
                            }
                        />
                        <TextInput
                            id="photo-date"
                            labelText="Photo Date"
                            type="date"
                            value={photoForm.photoDate}
                            onChange={(e) =>
                                setPhotoForm((p) => ({
                                    ...p,
                                    photoDate: e.target.value,
                                }))
                            }
                        />
                        <TextArea
                            id="photo-description"
                            labelText="Description"
                            value={photoForm.description}
                            onChange={(e) =>
                                setPhotoForm((p) => ({
                                    ...p,
                                    description: e.target.value,
                                }))
                            }
                            rows={3}
                        />
                        <TextInput
                            id="photo-image-url"
                            labelText="Image URL"
                            value={photoForm.imageUrl}
                            onChange={(e) =>
                                setPhotoForm((p) => ({
                                    ...p,
                                    imageUrl: e.target.value,
                                }))
                            }
                        />
                        {photoError ? (
                            <InlineNotification
                                kind="error"
                                subtitle={photoError}
                                hideCloseButton
                                lowContrast
                            />
                        ) : null}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "0.75rem",
                            }}
                        >
                            <Button kind="secondary" type="button" onClick={closePhotoModal}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={photoSaving || !photoForm.title.trim()}>
                                {editingPhoto ? "Save" : "Create"}
                            </Button>
                        </div>
                    </Stack>
                </form>
            </Modal>

            {/* ── Delete Confirmation Modal ── */}
            <Modal
                title="Confirm Delete"
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
            >
                <Stack gap={5}>
                    <p style={{ color: "var(--cds-text-secondary)" }}>
                        Delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
                    </p>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: "0.75rem",
                        }}
                    >
                        <Button
                            kind="secondary"
                            type="button"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Cancel
                        </Button>
                        <Button kind="danger" type="button" onClick={handleDelete}>
                            Delete
                        </Button>
                    </div>
                </Stack>
            </Modal>
        </div>
    );
}
