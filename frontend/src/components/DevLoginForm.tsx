import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TextInput, Button, Form, Tile } from "@carbon/react";
import { useAuth } from "../context/AuthContext";

export function DevLoginForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [username, setUsername] = useState("dev@general-portal.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/admin", { replace: true });
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Login failed");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setError("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tile style={{ maxWidth: "24rem", margin: "1.5rem auto 0" }}>
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--cds-text-primary)" }}>
        Developer Login
      </h2>
      <p style={{ marginTop: "0.25rem", fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
        Configure DEV_AUTH_USERNAME and DEV_AUTH_PASSWORD in .env.local
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
              background: "var(--cds-support-error)",
              backgroundClip: "padding-box",
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
        <Button type="submit" disabled={loading} style={{ marginTop: "1rem" }}>
          {loading ? "Signing in..." : "Sign In (Dev)"}
        </Button>
      </Form>
    </Tile>
  );
}
