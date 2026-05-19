import { useState } from "react";
import { TextInput, Select, SelectItem, Button, InlineNotification, Stack } from "@carbon/react";
import { Add } from "@carbon/icons-react";
import { Card } from "../../components/Card";
import { useAuth } from "../../hooks/useAuth";
import { workspaceApi } from "../../api/workspaceApi";

const roleOptions = [
	{ value: "admin", text: "Admin" },
	{ value: "president", text: "President" },
	{ value: "officer", text: "Officer" },
	{ value: "member", text: "Member" },
];

export function AdminUserManager() {
	const { user } = useAuth();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [role, setRole] = useState("member");
	const [submitting, setSubmitting] = useState(false);
	const [notification, setNotification] = useState<{
		kind: "success" | "error";
		message: string;
	} | null>(null);

	if (user?.role !== "admin") return null;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setNotification(null);
		if (!username.trim() || !displayName.trim() || !password.trim()) return;
		setSubmitting(true);
		try {
			await workspaceApi.createAdminUser({
				email: username.trim(),
				displayName: displayName.trim(),
				password: password.trim(),
				role,
			});
			setNotification({
				kind: "success",
				message: `User "${displayName}" created. They can sign in with: ${username.trim()} / ${password.trim()}`,
			});
			setUsername("");
			setPassword("");
			setDisplayName("");
			setRole("member");
		} catch (err) {
			setNotification({
				kind: "error",
				message: err instanceof Error ? err.message : "Failed to create user",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<Card padding="lg">
			<h2
				style={{
					fontSize: "1.125rem",
					fontWeight: 600,
					marginBottom: "1rem",
					color: "var(--cds-text-primary)",
				}}
			>
				Create User Account
			</h2>
			<p
				style={{
					fontSize: "0.875rem",
					color: "var(--cds-text-secondary)",
					marginBottom: "1rem",
				}}
			>
				Create a new user with a custom username and password.
			</p>

			{notification && (
				<div style={{ marginBottom: "1rem" }}>
					<InlineNotification
						kind={notification.kind}
						title={notification.message}
						lowContrast
						onClose={() => setNotification(null)}
					/>
				</div>
			)}

			<form onSubmit={handleSubmit}>
				<Stack gap={5}>
					<TextInput
						id="user-username"
						labelText="Username / Email"
						value={username}
						onChange={(e: any) => setUsername(e.target.value)}
						placeholder="user@example.com"
						disabled={submitting}
					/>
					<TextInput
						id="user-name"
						labelText="Display name"
						value={displayName}
						onChange={(e: any) => setDisplayName(e.target.value)}
						placeholder="Jane Smith"
						disabled={submitting}
					/>
					<TextInput
						id="user-password"
						labelText="Password"
						type="password"
						value={password}
						onChange={(e: any) => setPassword(e.target.value)}
						placeholder="Set a password"
						disabled={submitting}
					/>
					<Select
						id="user-role"
						labelText="Role"
						value={role}
						onChange={(e: any) => setRole(e.target.value)}
						disabled={submitting}
					>
						{roleOptions.map((opt) => (
							<SelectItem key={opt.value} value={opt.value} text={opt.text} />
						))}
					</Select>
					<Button
						type="submit"
						renderIcon={Add}
						disabled={
							!username.trim() ||
							!displayName.trim() ||
							!password.trim() ||
							submitting
						}
					>
						{submitting ? "Creating..." : "Create User"}
					</Button>
				</Stack>
			</form>
		</Card>
	);
}
