import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
	Button,
	TextInput,
	TextArea,
	Tile,
	Stack,
	Tag,
	Grid,
	Column,
	InlineNotification,
	Form,
	DatePicker,
	DatePickerInput,
	TimePicker,
	TimePickerSelect,
	SelectItem,
} from "@carbon/react";
import { Add, ChevronDown, ChevronRight, Edit, TrashCan } from "@carbon/icons-react";
import { PageLayout } from "../../components/PageLayout/PageLayout";
import { Modal } from "../../components/Modal";
import { LoadingState, ErrorState, EmptyState } from "../../components/StateViews";
import { workspaceApi } from "../../api/workspaceApi";
import { useAuth } from "../../context/AuthContext";
import { useMeetings } from "../../hooks/useWorkspaceResources";
import { useUIStore } from "../../stores/useUIStore";
import { formatDate } from "../../utils/format";
import type { Meeting } from "../../types";

const ROLE_LEVELS: Record<string, number> = { admin: 4, president: 3, officer: 2, member: 1 };

function canOrganize(role: string | null): boolean {
	return role != null && (ROLE_LEVELS[role] ?? 1) >= 3;
}

export function MeetingsPage() {
	const { user } = useAuth();
	const portal = useUIStore((s) => s.portal) || "developers";
	const { data: meetings, error, isLoading, refetch } = useMeetings();

	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [newModalOpen, setNewModalOpen] = useState(false);
	const [editMinutesModalOpen, setEditMinutesModalOpen] = useState(false);
	const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string>();

	const [confirmDelete, setConfirmDelete] = useState<Meeting | null>(null);
	const [form, setForm] = useState({
		title: "",
		date: "",
		time: "12:00",
		timePeriod: "PM" as "AM" | "PM",
		location: "",
		description: "",
		agendaItems: [""],
	});

	const [minutesForm, setMinutesForm] = useState({ minutes: "", actionItems: [""] });

	function openNewModal() {
		setForm({
			title: "",
			date: "",
			time: "12:00",
			timePeriod: "PM",
			location: "",
			description: "",
			agendaItems: [""],
		});
		setNewModalOpen(true);
	}

	function openEditMinutes(m: Meeting) {
		setEditingMeeting(m);
		setMinutesForm({
			minutes: m.minutes || "",
			actionItems: m.actionItems?.length ? m.actionItems : [""],
		});
		setEditMinutesModalOpen(true);
	}

	function addAgendaItem() {
		setForm((f) => ({ ...f, agendaItems: [...f.agendaItems, ""] }));
	}

	function removeAgendaItem(i: number) {
		setForm((f) => ({ ...f, agendaItems: f.agendaItems.filter((_, idx) => idx !== i) }));
	}

	function addActionItem() {
		setMinutesForm((f) => ({ ...f, actionItems: [...f.actionItems, ""] }));
	}

	function removeActionItem(i: number) {
		setMinutesForm((f) => ({ ...f, actionItems: f.actionItems.filter((_, idx) => idx !== i) }));
	}

	async function handleCreate(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setSaveError(undefined);
		setSaving(true);
		try {
			const validAgenda = form.agendaItems.filter((a) => a.trim());
			await workspaceApi.createMeeting({
				title: form.title,
				date: form.date,
				time: `${form.time} ${form.timePeriod}`,
				location: form.location,
				description: form.description,
				agendaItems: validAgenda,
			});
			toast.success("Meeting created");
			setNewModalOpen(false);
			refetch();
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Could not create meeting";
			setSaveError(msg);
			toast.error(msg);
		} finally {
			setSaving(false);
		}
	}

	async function handleSaveMinutes() {
		if (!editingMeeting) return;
		setSaveError(undefined);
		setSaving(true);
		try {
			const validActions = minutesForm.actionItems.filter((a) => a.trim());
			await workspaceApi.updateMeeting(editingMeeting.id, {
				minutes: minutesForm.minutes,
				actionItems: validActions,
			});
			toast.success("Minutes saved");
			setEditMinutesModalOpen(false);
			setEditingMeeting(null);
			refetch();
		} catch (e) {
			const msg = e instanceof Error ? e.message : "Could not save minutes";
			setSaveError(msg);
			toast.error(msg);
		} finally {
			setSaving(false);
		}
	}

	async function handleRsvp(id: string, response: string) {
		try {
			await workspaceApi.rsvpMeeting(id, response);
			toast.success(`RSVP: ${response}`);
			refetch();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "RSVP failed");
		}
	}

	async function handleConfirmDelete() {
		if (!confirmDelete) return;
		try {
			await workspaceApi.deleteMeeting(confirmDelete.id);
			toast.success("Meeting deleted");
			setConfirmDelete(null);
			refetch();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Delete failed");
		}
	}

	if (isLoading) return <LoadingState />;
	if (error) return <ErrorState message={error} onRetry={refetch} />;

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
				title="Meetings"
				description="Schedule, manage, and record meeting minutes."
				actions={
					<Button type="button" renderIcon={Add} onClick={openNewModal}>
						New Meeting
					</Button>
				}
			>
				{!meetings || meetings.length === 0 ? (
					<EmptyState
						title="No meetings"
						description="Upcoming meetings will appear here."
					/>
				) : (
					<Stack gap={4}>
						{meetings.map((m) => {
							const isExpanded = expandedId === m.id;
							const rsvpStatus = m.rsvpStatus;
							const userIsOrganizer =
								user?.displayName === m.organizerName ||
								canOrganize(user?.role ?? null);

							return (
								<Tile key={m.id} style={{ padding: "1rem" }}>
									<div
										role="button"
										tabIndex={0}
										onClick={() => setExpandedId(isExpanded ? null : m.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												setExpandedId(isExpanded ? null : m.id);
											}
										}}
										style={{
											cursor: "pointer",
											display: "flex",
											alignItems: "flex-start",
											justifyContent: "space-between",
											gap: "0.75rem",
										}}
									>
										<div style={{ flex: 1 }}>
											<div
												style={{
													display: "flex",
													alignItems: "center",
													gap: "0.5rem",
													marginBottom: "0.25rem",
												}}
											>
												{isExpanded ? (
													<ChevronDown size={16} />
												) : (
													<ChevronRight size={16} />
												)}
												<span
													style={{
														fontWeight: 600,
														fontSize: "1rem",
														color: "var(--cds-text-primary)",
													}}
												>
													{m.title}
												</span>
												<Tag
													type={
														m.status === "completed"
															? "green"
															: m.status === "in_progress"
																? "blue"
																: m.status === "cancelled"
																	? "red"
																	: "teal"
													}
													size="sm"
												>
													{m.status.replace(/_/g, " ")}
												</Tag>
											</div>
											<div
												style={{
													display: "flex",
													flexWrap: "wrap",
													gap: "0.75rem",
													fontSize: "0.8125rem",
													color: "var(--cds-text-secondary)",
													marginLeft: "1.25rem",
												}}
											>
												<span>
													{formatDate(m.date)} at {m.time}
												</span>
												<span>{m.location}</span>
												<span>{m.attendeeCount} attendees</span>
											</div>
										</div>

										<div
											style={{
												display: "flex",
												gap: "0.25rem",
												flexShrink: 0,
											}}
											onClick={(e) => e.stopPropagation()}
										>
											{["yes", "no", "maybe"].map((opt) => (
												<Button
													key={opt}
													kind={rsvpStatus === opt ? "primary" : "ghost"}
													type="button"
													size="sm"
													onClick={() => handleRsvp(m.id, opt)}
												>
													{opt.charAt(0).toUpperCase() + opt.slice(1)}
												</Button>
											))}
											{m.status !== "completed" &&
												m.status !== "cancelled" &&
												userIsOrganizer && (
													<>
														<Button
															kind="ghost"
															type="button"
															size="sm"
															renderIcon={Edit}
															hasIconOnly
															iconDescription="Edit minutes"
															onClick={() => openEditMinutes(m)}
														/>
														<Button
															kind="ghost"
															type="button"
															size="sm"
															renderIcon={TrashCan}
															hasIconOnly
															iconDescription="Delete"
															onClick={() => setConfirmDelete(m)}
														/>
													</>
												)}
										</div>
									</div>

									{isExpanded && (
										<div
											style={{
												marginTop: "1rem",
												paddingTop: "1rem",
												borderTop: "1px solid var(--cds-border-subtle)",
												marginLeft: "0",
											}}
										>
											<Grid>
												<Column lg={8} md={8} sm={4}>
													<Stack gap={5}>
														{m.description && (
															<div>
																<h4
																	style={{
																		fontSize: "0.875rem",
																		fontWeight: 600,
																		marginBottom: "0.25rem",
																		color: "var(--cds-text-primary)",
																	}}
																>
																	Description
																</h4>
																<p
																	style={{
																		fontSize: "0.875rem",
																		color: "var(--cds-text-secondary)",
																		whiteSpace: "pre-wrap",
																	}}
																>
																	{m.description}
																</p>
															</div>
														)}
														{m.agendaItems?.length > 0 && (
															<div>
																<h4
																	style={{
																		fontSize: "0.875rem",
																		fontWeight: 600,
																		marginBottom: "0.375rem",
																		color: "var(--cds-text-primary)",
																	}}
																>
																	Agenda
																</h4>
																<Stack gap={2}>
																	{m.agendaItems.map(
																		(item, i) => (
																			<div
																				key={i}
																				style={{
																					display: "flex",
																					alignItems:
																						"center",
																					gap: "0.5rem",
																					fontSize:
																						"0.875rem",
																					color: "var(--cds-text-secondary)",
																				}}
																			>
																				<span
																					style={{
																						width: "1.25rem",
																						height: "1.25rem",
																						borderRadius:
																							"50%",
																						background:
																							"var(--cds-layer-02)",
																						display:
																							"flex",
																						alignItems:
																							"center",
																						justifyContent:
																							"center",
																						fontSize:
																							"0.6875rem",
																						fontWeight: 600,
																						color: "var(--cds-text-primary)",
																						flexShrink: 0,
																					}}
																				>
																					{i + 1}
																				</span>
																				{item}
																			</div>
																		),
																	)}
																</Stack>
															</div>
														)}
														{m.minutes && (
															<div>
																<h4
																	style={{
																		fontSize: "0.875rem",
																		fontWeight: 600,
																		marginBottom: "0.25rem",
																		color: "var(--cds-text-primary)",
																	}}
																>
																	Minutes
																</h4>
																<p
																	style={{
																		fontSize: "0.875rem",
																		color: "var(--cds-text-secondary)",
																		whiteSpace: "pre-wrap",
																	}}
																>
																	{m.minutes}
																</p>
															</div>
														)}
													</Stack>
												</Column>
											</Grid>
										</div>
									)}
								</Tile>
							);
						})}
					</Stack>
				)}
			</PageLayout>

			{/* New Meeting Modal */}
			<Modal title="New Meeting" isOpen={newModalOpen} onClose={() => setNewModalOpen(false)}>
				<Form onSubmit={handleCreate}>
					<Stack gap={5}>
						<TextInput
							id="mtg-title"
							labelText="Title"
							required
							value={form.title}
							onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
						/>
						<Grid>
							<Column lg={8} md={8} sm={4}>
								<DatePicker
									datePickerType="single"
									value={form.date}
									onChange={([d]: Date[]) =>
										setForm((f) => ({
											...f,
											date: d ? d.toISOString().slice(0, 10) : "",
										}))
									}
								>
									<DatePickerInput
										id="mtg-date"
										labelText="Date"
										placeholder="mm/dd/yyyy"
									/>
								</DatePicker>
							</Column>
							<Column lg={8} md={8} sm={4}>
								<div
									style={{
										display: "flex",
										gap: "0.5rem",
										alignItems: "flex-end",
									}}
								>
									<div style={{ flex: 1 }}>
										<TimePicker
											id="mtg-time"
											labelText="Time"
											pattern="[\\d:]+"
											value={form.time}
											onChange={(e) =>
												setForm((f) => ({ ...f, time: e.target.value }))
											}
										/>
									</div>
									<TimePickerSelect
										id="mtg-tz"
										value={form.timePeriod}
										onChange={(e) =>
											setForm((f) => ({
												...f,
												timePeriod: e.target.value as "AM" | "PM",
											}))
										}
									>
										<SelectItem value="AM" text="AM" />
										<SelectItem value="PM" text="PM" />
									</TimePickerSelect>
								</div>
							</Column>
						</Grid>
						<TextInput
							id="mtg-location"
							labelText="Location"
							value={form.location}
							onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
						/>
						<TextArea
							id="mtg-desc"
							labelText="Description"
							value={form.description}
							onChange={(e) =>
								setForm((f) => ({ ...f, description: e.target.value }))
							}
						/>
						<div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									marginBottom: "0.5rem",
								}}
							>
								<span
									style={{
										fontSize: "0.875rem",
										fontWeight: 500,
										color: "var(--cds-text-primary)",
									}}
								>
									Agenda Items
								</span>
								<Button
									kind="tertiary"
									size="sm"
									onClick={addAgendaItem}
									type="button"
								>
									Add Item
								</Button>
							</div>
							<Stack gap={3}>
								{form.agendaItems.map((item, i) => (
									<div
										key={i}
										style={{
											display: "flex",
											gap: "0.5rem",
											alignItems: "center",
										}}
									>
										<TextInput
											id={`mtg-agenda-${i}`}
											labelText={`#${i + 1}`}
											hideLabel
											value={item}
											onChange={(e) => {
												const items = [...form.agendaItems];
												items[i] = e.target.value;
												setForm((f) => ({ ...f, agendaItems: items }));
											}}
										/>
										{form.agendaItems.length > 1 && (
											<Button
												kind="ghost"
												size="sm"
												renderIcon={TrashCan}
												hasIconOnly
												iconDescription="Remove"
												onClick={() => removeAgendaItem(i)}
												style={{ marginTop: "0.5rem" }}
											/>
										)}
									</div>
								))}
							</Stack>
						</div>
						{saveError ? (
							<InlineNotification
								kind="error"
								subtitle={saveError}
								hideCloseButton
								lowContrast
							/>
						) : null}
						<div
							style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}
						>
							<Button
								kind="secondary"
								type="button"
								onClick={() => setNewModalOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={saving}>
								{saving ? "Creating..." : "Create Meeting"}
							</Button>
						</div>
					</Stack>
				</Form>
			</Modal>

			{/* Edit Minutes Modal */}
			<Modal
				title={editingMeeting ? `Minutes: ${editingMeeting.title}` : "Edit Minutes"}
				isOpen={editMinutesModalOpen}
				onClose={() => {
					setEditMinutesModalOpen(false);
					setEditingMeeting(null);
				}}
			>
				<Stack gap={5}>
					<TextArea
						id="mtg-minutes"
						labelText="Minutes"
						value={minutesForm.minutes}
						onChange={(e) => setMinutesForm((f) => ({ ...f, minutes: e.target.value }))}
						rows={6}
					/>
					<div>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "0.5rem",
							}}
						>
							<span
								style={{
									fontSize: "0.875rem",
									fontWeight: 500,
									color: "var(--cds-text-primary)",
								}}
							>
								Action Items
							</span>
							<Button kind="tertiary" size="sm" onClick={addActionItem} type="button">
								Add Item
							</Button>
						</div>
						<Stack gap={3}>
							{minutesForm.actionItems.map((item, i) => (
								<div
									key={i}
									style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
								>
									<TextInput
										id={`mtg-action-${i}`}
										labelText={`#${i + 1}`}
										hideLabel
										value={item}
										onChange={(e) => {
											const items = [...minutesForm.actionItems];
											items[i] = e.target.value;
											setMinutesForm((f) => ({ ...f, actionItems: items }));
										}}
									/>
									{minutesForm.actionItems.length > 1 && (
										<Button
											kind="ghost"
											size="sm"
											renderIcon={TrashCan}
											hasIconOnly
											iconDescription="Remove"
											onClick={() => removeActionItem(i)}
											style={{ marginTop: "0.5rem" }}
										/>
									)}
								</div>
							))}
						</Stack>
					</div>
					{saveError ? (
						<InlineNotification
							kind="error"
							subtitle={saveError}
							hideCloseButton
							lowContrast
						/>
					) : null}
					<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
						<Button
							kind="secondary"
							type="button"
							onClick={() => {
								setEditMinutesModalOpen(false);
								setEditingMeeting(null);
							}}
						>
							Cancel
						</Button>
						<Button onClick={handleSaveMinutes} disabled={saving}>
							{saving ? "Saving..." : "Save Minutes"}
						</Button>
					</div>
				</Stack>
			</Modal>

			{/* Delete Confirmation Modal */}
			<Modal
				title="Delete Meeting"
				description="This action cannot be undone."
				isOpen={!!confirmDelete}
				onClose={() => setConfirmDelete(null)}
			>
				<Stack gap={5}>
					<p style={{ color: "var(--cds-text-secondary)" }}>
						Delete &quot;{confirmDelete?.title}&quot;?
					</p>
					<Stack orientation="horizontal" gap={5} style={{ justifyContent: "flex-end" }}>
						<Button
							kind="secondary"
							type="button"
							onClick={() => setConfirmDelete(null)}
						>
							Cancel
						</Button>
						<Button kind="danger" type="button" onClick={handleConfirmDelete}>
							Delete
						</Button>
					</Stack>
				</Stack>
			</Modal>
		</div>
	);
}
