import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tile, Button, TextInput, InlineNotification, Stack } from "@carbon/react";
import { useSession, signIn } from "@hono/auth-js/react";
import { LoadingState } from "../components/StateViews";
import { getClientConfig } from "../config/clientConfig";
import { useUIStore } from "../stores/useUIStore";

export function LoginPage() {
	const { status } = useSession();
	const navigate = useNavigate();
	const portal = useUIStore((s) => s.portal);
	const setPortal = useUIStore((s) => s.setPortal);
	const config = getClientConfig(portal ?? undefined);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const dashboardPath = portal ? `/${portal}/dashboard` : "/";

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const oauthError = params.get("error");
		if (oauthError) {
			const messages: Record<string, string> = {
				AccessDenied: "Sign-in was cancelled or denied.",
				Configuration: "Authentication is not configured correctly.",
				OAuthCallbackError: "Authentication service encountered an error.",
				OAuthAccountNotLinked: "This account is already linked to another sign-in method.",
				SessionRequired: "Please sign in to continue.",
			};
			setError(messages[oauthError] || `Sign-in failed: ${oauthError}`);
			window.history.replaceState({}, "", "/login");
		}
	}, []);

	useEffect(() => {
		if (status === "authenticated") {
			navigate(dashboardPath, { replace: true });
		}
	}, [status, navigate, dashboardPath]);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		try {
			const result = await signIn("credentials", { username, password, redirect: false });
			if (result?.error) {
				setError(
					result.error === "CredentialsSignin"
						? "Invalid username or password"
						: result.error,
				);
			} else {
				window.location.href = dashboardPath;
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Login failed");
		} finally {
			setLoading(false);
		}
	}

	if (status === "loading") return <LoadingState label="Checking session..." />;

	function goBack() {
		setPortal(null);
		document.title = "General Portal";
		const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
		if (link) link.remove();
		document.documentElement.style.removeProperty("--client-primary");
		document.documentElement.style.removeProperty("--client-secondary");
		navigate("/", { replace: true });
	}

	return (
		<div
			style={{
				display: "flex",
				minHeight: "100vh",
				alignItems: "center",
				justifyContent: "center",
				background: "var(--cds-background)",
			}}
		>
			<Tile
				style={{ maxWidth: "24rem", width: "100%", padding: "2rem", position: "relative" }}
			>
				<button
					type="button"
					onClick={goBack}
					aria-label="Back to portal selection"
					style={{
						position: "absolute",
						top: "0.75rem",
						left: "0.75rem",
						background: "none",
						border: "none",
						cursor: "pointer",
						fontSize: "1.25rem",
						color: "var(--cds-text-secondary, #525252)",
						padding: "0.25rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					&#x2190;
				</button>
				<div
					style={{
						margin: "0 auto",
						width: "3rem",
						height: "3rem",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						background: "var(--cds-button-primary)",
						fontSize: "1.125rem",
						fontWeight: 600,
						color: "#ffffff",
					}}
				>
					{config.favicon ? (
						<img
							src={config.favicon}
							alt={config.shortName}
							style={{ width: "3rem", height: "3rem", borderRadius: "4px" }}
						/>
					) : (
						<span style={{ fontSize: "1.125rem", fontWeight: 600, color: "#ffffff" }}>
							{config.shortName}
						</span>
					)}
				</div>
				<h1
					style={{
						marginTop: "1rem",
						textAlign: "center",
						fontSize: "1.25rem",
						fontWeight: 600,
						color: "var(--cds-text-primary)",
					}}
				>
					{portal ? config.displayName : "General Portal"}
				</h1>
				<p
					style={{
						marginTop: "0.5rem",
						textAlign: "center",
						fontSize: "0.875rem",
						color: "var(--cds-text-secondary)",
					}}
				>
					{portal ? config.description : "Select a portal on the landing page"}
				</p>

				{error && (
					<div style={{ marginTop: "1rem" }}>
						<InlineNotification
							kind="error"
							title="Login failed"
							subtitle={error}
							onClose={() => setError(null)}
							lowContrast
						/>
					</div>
				)}

				<Stack gap={5} style={{ marginTop: "1.5rem" }}>
					<Button
						kind="tertiary"
						style={{ width: "100%" }}
						onClick={() => signIn("microsoft-entra-id", { redirect: true })}
						disabled={loading}
					>
						<span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
							<svg viewBox="0 0 21 21" width="20" height="20">
								<rect x="1" y="1" width="9" height="9" fill="#f25022" />
								<rect x="11" y="1" width="9" height="9" fill="#7fba00" />
								<rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
								<rect x="11" y="11" width="9" height="9" fill="#ffb900" />
							</svg>
							Sign in with Microsoft
						</span>
					</Button>

					{!import.meta.env.VITE_DISABLE_DEV_AUTH && (
						<>
							<div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
								<div
									style={{
										flex: 1,
										height: "1px",
										background: "var(--cds-border-subtle)",
									}}
								/>
								<span
									style={{
										fontSize: "0.875rem",
										color: "var(--cds-text-secondary)",
									}}
								>
									or
								</span>
								<div
									style={{
										flex: 1,
										height: "1px",
										background: "var(--cds-border-subtle)",
									}}
								/>
							</div>

							<form onSubmit={handleSubmit}>
								<Stack gap={5}>
									<TextInput
										id="username"
										labelText="Username"
										value={username}
										onChange={(e: any) => setUsername(e.target.value)}
										placeholder="dev@generalportal.local"
										disabled={loading}
									/>
									<TextInput
										id="password"
										labelText="Password"
										type="password"
										value={password}
										onChange={(e: any) => setPassword(e.target.value)}
										placeholder="Enter password"
										disabled={loading}
									/>
									<Button
										type="submit"
										kind="primary"
										style={{ width: "100%" }}
										disabled={loading}
									>
										{loading ? "Signing in..." : "Dev Sign In"}
									</Button>
								</Stack>
							</form>
						</>
					)}
				</Stack>
			</Tile>
		</div>
	);
}
