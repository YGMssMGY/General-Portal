import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextInput, Button, Form, Tile } from "@carbon/react";
import { useAuth } from "../context/AuthContext";

export function DevLoginForm() {
  const navigate = useNavigate();
  const { isAuthenticated, login, isLoading } = useAuth();
  const [username, setUsername] = useState("dev@generalportal.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    navigate("/admin", { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(username, password);
      navigate("/admin", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Tile style={{ maxWidth: "24rem", margin: "1.5rem auto 0" }}>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
        Developer Login
      </h2>
      <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
        Default credentials: dev@generalportal.local / devpass123
      </p>
      <Form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <TextInput
          id="dev-username"
          labelText="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <TextInput
          id="dev-password"
          labelText="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? (
          <p
            style={{
              borderLeft: "4px solid var(--cds-support-error)",
              backgroundColor: "#fff1f1",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              color: "#a2191f",
              marginTop: "0.75rem",
            }}
          >
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting || isLoading} style={{ marginTop: "1rem" }}>
          {submitting || isLoading ? "Signing in..." : "Sign In (Dev)"}
        </Button>
      </Form>
    </Tile>
  );
}
