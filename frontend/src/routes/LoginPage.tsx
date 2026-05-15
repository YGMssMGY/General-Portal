import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tile, Button, TextInput, InlineNotification, Stack } from "@carbon/react";
import { useSession, signIn } from "@hono/auth-js/react";
import { LoadingState } from "../components/StateViews";
import { getClientConfig } from "../config/clientConfig";

const providers = [
  { id: "github", label: "GitHub" },
  { id: "google", label: "Google" },
  { id: "microsoft", label: "Microsoft" },
];

export function LoginPage() {
  const { data: session, status } = useSession();
  const navigate = useNavigate();
  const config = getClientConfig();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/admin", { replace: true });
    }
  }, [status, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", { username, password, redirect: false });
      if (result?.error) {
        setError(
          result.error === "CredentialsSignin" ? "Invalid username or password" : result.error,
        );
      } else {
        window.location.href = "/admin";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return <LoadingState label="Checking session..." />;

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
      <Tile style={{ maxWidth: "24rem", width: "100%", padding: "2rem" }}>
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
          {config.shortName}
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
          {config.displayName}
        </h1>
        <p
          style={{
            marginTop: "0.5rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--cds-text-secondary)",
          }}
        >
          {config.description}
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
          {providers.map((p) => (
            <Button
              key={p.id}
              kind="tertiary"
              style={{ width: "100%" }}
              onClick={() => signIn(p.id, { redirect: true })}
              disabled={loading}
            >
              {p.label === "Microsoft" ? "Sign in with Microsoft" : `Sign in with ${p.label}`}
            </Button>
          ))}

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--cds-border-subtle)" }} />
            <span style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>or</span>
            <div style={{ flex: 1, height: "1px", background: "var(--cds-border-subtle)" }} />
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
              <Button type="submit" kind="primary" style={{ width: "100%" }} disabled={loading}>
                {loading ? "Signing in..." : "Dev Sign In"}
              </Button>
            </Stack>
          </form>
        </Stack>
      </Tile>
    </div>
  );
}
