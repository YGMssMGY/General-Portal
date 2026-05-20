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
}
