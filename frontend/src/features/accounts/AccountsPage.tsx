import { useMemo, useState, useEffect, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
	Tile,
	Stack,
	Tag,
	ProgressBar,
	Button,
	TextInput,
	Select,
	SelectItem,
	InlineNotification,
} from "@carbon/react";
import { Add, TrashCan } from "@carbon/icons-react";
import { PageHeader } from "../../components/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { AdminUserManager } from "./AdminUserManager";
import { getClientConfig } from "../../config/clientConfig";
import { workspaceApi } from "../../api/workspaceApi";
import { Modal } from "../../components/Modal";
import { fetchJson } from "../../api/httpClient";
import { useUIStore } from "../../stores/useUIStore";
import type { LeaderboardEntry, KudosEntry } from "../../types";
import { formatDateTime } from "../../utils/format";

export function AccountsPage() {
	const { user } = useAuth();
	const portal = useUIStore((s) => s.portal) || "developers";
	const config = useMemo(() => getClientConfig(), []);
	const [allUsers, setAllUsers] = useState<any[]>([]);
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
	const [kudos, setKudos] = useState<KudosEntry[]>([]);
	const [lbError, setLbError] = useState(false);

	useEffect(() => {
		if (user?.role === "admin") {
			workspaceApi
				.getAdminUsers()
				.then(setAllUsers)
				.catch(() => {});
		}
	}, [user?.role]);

	useEffect(() => {
		workspaceApi
			.getLeaderboard()
			.then(setLeaderboard)
			.catch(() => setLbError(true));
		workspaceApi
			.getKudos()
			.then(setKudos)
			.catch(() => {});
	}, []);

	const [whitelist, setWhitelist] = useState<any[]>([]);
	const [wlModalOpen, setWlModalOpen] = useState(false);
	const [wlEmail, setWlEmail] = useState("");
	const [wlRole, setWlRole] = useState("admin");
	const [wlError, setWlError] = useState<string>();
	const [wlSaving, setWlSaving] = useState(false);
	const [deleteTarget, setDeleteTarget] = useState<any>();

	useEffect(() => {
		fetchJson<any[]>("/admin/whitelist")
			.then(setWhitelist)
			.catch(() => {});
	}, []);

	async function handleAddWhitelist(e: FormEvent) {
		e.preventDefault();
		setWlError(undefined);
		setWlSaving(true);
		try {
			await fetchJson("/admin/whitelist", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: wlEmail, role: wlRole }),
			});
			setWlModalOpen(false);
			setWlEmail("");
			setWlRole("admin");
			const updated = await fetchJson<any[]>("/admin/whitelist");
			setWhitelist(updated);
		} catch (err: any) {
			setWlError(err?.message || "Failed to add user");
		} finally {
			setWlSaving(false);
		}
	}

	async function handleDeleteWhitelist() {
		if (!deleteTarget) return;
		try {
			await fetchJson(`/admin/whitelist/${deleteTarget.id}`, { method: "DELETE" });
			setDeleteTarget(undefined);
			setWhitelist((prev) => prev.filter((u) => u.id !== deleteTarget.id));
		} catch (err: any) {
			console.error("Failed to delete whitelist user:", err);
		}
	}

	const xp = user?.xp ?? 0;
	const level = user?.level ?? 0;
	const streak = user?.streak ?? 0;
	const nextLevelXp = (level + 1) * 100;
	const progressPct = Math.min((xp / nextLevelXp) * 100, 100);

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
			<PageHeader title="Account" description="View your account details and manage users." />

			<Stack gap={6}>
				<Tile style={{ padding: "1.5rem" }}>
					<h3
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--cds-text-primary)",
						}}
					>
						Your Account
					</h3>
					<Stack gap={5}>
						<div>
							<p
								style={{
									fontSize: "0.75rem",
									color: "var(--cds-text-secondary)",
									marginBottom: "0.25rem",
								}}
							>
								Name
							</p>
							<p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>
								{user?.displayName || "\u2014"}
							</p>
						</div>
						<div>
							<p
								style={{
									fontSize: "0.75rem",
									color: "var(--cds-text-secondary)",
									marginBottom: "0.25rem",
								}}
							>
								Username
							</p>
							<p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>
								{user?.email || "\u2014"}
							</p>
						</div>
						<div>
							<p
								style={{
									fontSize: "0.75rem",
									color: "var(--cds-text-secondary)",
									marginBottom: "0.25rem",
								}}
							>
								Role
							</p>
							<Tag
								type={
									user?.role === "admin"
										? "red"
										: user?.role === "president"
											? "purple"
											: user?.role === "officer"
												? "blue"
												: "gray"
								}
							>
								{user?.role
									? (user.role?.charAt(0).toUpperCase() ?? "") +
										(user.role?.slice(1) ?? "")
									: "\u2014"}
							</Tag>
						</div>
						<div>
							<p
								style={{
									fontSize: "0.75rem",
									color: "var(--cds-text-secondary)",
									marginBottom: "0.25rem",
								}}
							>
								Workspace
							</p>
							<p style={{ fontSize: "0.875rem", color: "var(--cds-text-primary)" }}>
								{user?.workspaceName || config.displayName}
							</p>
						</div>
					</Stack>
				</Tile>

				{/* Gamification */}
				<Tile style={{ padding: "1.5rem" }}>
					<h3
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--cds-text-primary)",
						}}
					>
						Progress
					</h3>
					<Stack gap={4}>
						<Stack orientation="horizontal" gap={6}>
							<div>
								<p
									style={{
										fontSize: "0.75rem",
										color: "var(--cds-text-secondary)",
										marginBottom: "0.125rem",
									}}
								>
									Level
								</p>
								<p
									style={{
										fontSize: "1.5rem",
										fontWeight: 700,
										color: "var(--cds-text-primary)",
									}}
								>
									{level}
								</p>
							</div>
							<div>
								<p
									style={{
										fontSize: "0.75rem",
										color: "var(--cds-text-secondary)",
										marginBottom: "0.125rem",
									}}
								>
									XP
								</p>
								<p
									style={{
										fontSize: "1.5rem",
										fontWeight: 700,
										color: "var(--cds-text-primary)",
									}}
								>
									{xp}
								</p>
							</div>
							<div>
								<p
									style={{
										fontSize: "0.75rem",
										color: "var(--cds-text-secondary)",
										marginBottom: "0.125rem",
									}}
								>
									Streak
								</p>
								<p
									style={{
										fontSize: "1.5rem",
										fontWeight: 700,
										color: "var(--cds-text-primary)",
									}}
								>
									{streak}d
								</p>
							</div>
						</Stack>
						<div>
							<p
								style={{
									fontSize: "0.75rem",
									color: "var(--cds-text-secondary)",
									marginBottom: "0.25rem",
								}}
							>
								Level {level + 1} — {xp} / {nextLevelXp} XP
							</p>
							<ProgressBar
								value={progressPct}
								label="Progress to next level"
								hideLabel
							/>
						</div>
					</Stack>
				</Tile>

				{/* Leaderboard */}
				<Tile style={{ padding: "1.5rem" }}>
					<h3
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--cds-text-primary)",
						}}
					>
						Leaderboard
					</h3>
					{lbError ? (
						<p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
							Could not load leaderboard.
						</p>
					) : leaderboard.length === 0 ? (
						<p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
							No data yet.
						</p>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
							{leaderboard.map((entry) => (
								<div
									key={entry.userId}
									style={{
										display: "flex",
										alignItems: "center",
										gap: "0.75rem",
										padding: "0.5rem 0.75rem",
										background:
											entry.displayName === user?.displayName
												? "var(--cds-layer-selected)"
												: "var(--cds-layer)",
										borderRadius: "4px",
									}}
								>
									<span
										style={{
											width: "1.5rem",
											fontWeight: 700,
											fontSize: "0.875rem",
											color: "var(--cds-text-secondary)",
											textAlign: "center",
										}}
									>
										{entry.rank}
									</span>
									<span
										style={{
											width: "2rem",
											height: "2rem",
											borderRadius: "50%",
											background: "var(--cds-button-tertiary)",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											color: "#fff",
											fontSize: "0.75rem",
											fontWeight: 600,
										}}
									>
										{(entry.displayName || "?").charAt(0).toUpperCase()}
									</span>
									<div style={{ flex: 1 }}>
										<p
											style={{
												fontSize: "0.875rem",
												fontWeight: 500,
												color: "var(--cds-text-primary)",
											}}
										>
											{entry.displayName}
										</p>
									</div>
									<span
										style={{
											fontSize: "0.8125rem",
											fontWeight: 600,
											color: "var(--cds-text-primary)",
										}}
									>
										{entry.xp} XP
									</span>
									<Tag type="blue">Lv.{entry.level}</Tag>
								</div>
							))}
						</div>
					)}
				</Tile>

				{/* Recent Kudos */}
				<Tile style={{ padding: "1.5rem" }}>
					<h3
						style={{
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: "1rem",
							color: "var(--cds-text-primary)",
						}}
					>
						Recent Kudos
					</h3>
					{kudos.length === 0 ? (
						<p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
							No kudos yet.
						</p>
					) : (
						<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
							{kudos.slice(0, 10).map((k) => (
								<div
									key={k.id}
									style={{
										padding: "0.625rem 0.75rem",
										background: "var(--cds-layer)",
										borderRadius: "4px",
									}}
								>
									<p
										style={{
											fontSize: "0.8125rem",
											color: "var(--cds-text-primary)",
										}}
									>
										<strong>{k.fromUser}</strong>
										{" \u2192 "}
										<strong>{k.toUser}</strong>
									</p>
									<p
										style={{
											fontSize: "0.75rem",
											color: "var(--cds-text-secondary)",
											marginTop: "0.125rem",
										}}
									>
										{k.message}
									</p>
									<p
										style={{
											fontSize: "0.6875rem",
											color: "var(--cds-text-helper)",
											marginTop: "0.25rem",
										}}
									>
										{formatDateTime(k.createdAt)}
									</p>
								</div>
							))}
						</div>
					)}
				</Tile>

				{user?.role === "admin" && (
					<Tile style={{ padding: "1.5rem" }}>
						<h3
							style={{
								fontSize: "1rem",
								fontWeight: 600,
								marginBottom: "1rem",
								color: "var(--cds-text-primary)",
							}}
						>
							All Accounts
						</h3>
						{allUsers.length === 0 ? (
							<p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
								No users found.
							</p>
						) : (
							<div
								style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
							>
								{allUsers.map((u: any) => (
									<div
										key={u.id}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.75rem",
											padding: "0.5rem 0.75rem",
											background: "var(--cds-layer)",
											borderRadius: "4px",
										}}
									>
										<div
											style={{
												width: "2rem",
												height: "2rem",
												borderRadius: "50%",
												background: "var(--cds-button-tertiary)",
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "#fff",
												fontSize: "0.75rem",
												fontWeight: 600,
											}}
										>
											{(u.displayName || "?").charAt(0).toUpperCase()}
										</div>
										<div style={{ flex: 1 }}>
											<p
												style={{
													fontSize: "0.875rem",
													fontWeight: 500,
													color: "var(--cds-text-primary)",
												}}
											>
												{u.displayName}
											</p>
											<p
												style={{
													fontSize: "0.75rem",
													color: "var(--cds-text-secondary)",
												}}
											>
												{u.email}
											</p>
										</div>
										<Tag
											type={
												u.role === "admin"
													? "red"
													: u.role === "president"
														? "purple"
														: u.role === "officer"
															? "blue"
															: "gray"
											}
										>
											{(u.role?.charAt(0).toUpperCase() ?? "") +
												(u.role?.slice(1) ?? "")}
										</Tag>
									</div>
								))}
							</div>
						)}
					</Tile>
				)}

				{user?.role === "admin" && (
					<Tile style={{ padding: "1.5rem" }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: "1rem",
							}}
						>
							<h3
								style={{
									fontSize: "1rem",
									fontWeight: 600,
									color: "var(--cds-text-primary)",
								}}
							>
								Whitelist
							</h3>
							<Button
								type="button"
								size="sm"
								renderIcon={Add}
								onClick={() => setWlModalOpen(true)}
							>
								Add Person
							</Button>
						</div>
						{whitelist.length === 0 ? (
							<p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
								No whitelisted users.
							</p>
						) : (
							<div
								style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
							>
								{whitelist.map((u: any) => (
									<div
										key={u.id}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "0.75rem",
											padding: "0.5rem 0.75rem",
											background: "var(--cds-layer)",
											borderRadius: "4px",
										}}
									>
										<div style={{ flex: 1 }}>
											<p
												style={{
													fontSize: "0.875rem",
													fontWeight: 500,
													color: "var(--cds-text-primary)",
												}}
											>
												{u.name}
											</p>
											<p
												style={{
													fontSize: "0.75rem",
													color: "var(--cds-text-secondary)",
												}}
											>
												{u.email}
											</p>
										</div>
										{u.workspaceName && (
											<Tag type="blue" size="sm">
												{u.workspaceName}
											</Tag>
										)}
										<span
											style={{
												fontSize: "0.6875rem",
												color: "var(--cds-text-helper)",
											}}
										>
											{formatDateTime(u.createdAt)}
										</span>
										<Button
											kind="ghost"
											type="button"
											size="sm"
											renderIcon={TrashCan}
											iconDescription="Remove"
											hasIconOnly
											onClick={() => setDeleteTarget(u)}
										/>
									</div>
								))}
							</div>
						)}
					</Tile>
				)}

				<Modal
					title="Add Person to Whitelist"
					isOpen={wlModalOpen}
					onClose={() => {
						setWlModalOpen(false);
						setWlEmail("");
						setWlRole("admin");
						setWlError(undefined);
					}}
				>
					<form onSubmit={handleAddWhitelist}>
						<Stack gap={5}>
							<TextInput
								id="wl-email"
								labelText="Email"
								type="email"
								required
								value={wlEmail}
								onChange={(e) => setWlEmail(e.target.value)}
							/>
							<Select
								id="wl-role"
								labelText="Access level"
								value={wlRole}
								onChange={(e) => setWlRole(e.target.value)}
							>
								<SelectItem value="admin" text="Admin" />
								<SelectItem value="officer" text="Officer" />
								<SelectItem value="member" text="Member" />
							</Select>
							{wlError ? (
								<InlineNotification
									kind="error"
									subtitle={wlError}
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
								<Button
									kind="secondary"
									type="button"
									onClick={() => {
										setWlModalOpen(false);
										setWlEmail("");
										setWlRole("admin");
										setWlError(undefined);
									}}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={wlSaving || !wlEmail.trim()}>
									{wlSaving ? "Adding..." : "Add"}
								</Button>
							</div>
						</Stack>
					</form>
				</Modal>

				<Modal
					title="Remove from Whitelist"
					isOpen={!!deleteTarget}
					onClose={() => setDeleteTarget(undefined)}
				>
					<Stack gap={5}>
						<p style={{ color: "var(--cds-text-secondary)" }}>
							Remove <strong>{deleteTarget?.name}</strong> ({deleteTarget?.email})?
						</p>
						<div
							style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}
						>
							<Button
								kind="secondary"
								type="button"
								onClick={() => setDeleteTarget(undefined)}
							>
								Cancel
							</Button>
							<Button kind="danger" type="button" onClick={handleDeleteWhitelist}>
								Remove
							</Button>
						</div>
					</Stack>
				</Modal>

				<AdminUserManager />
			</Stack>
		</div>
	);
}
