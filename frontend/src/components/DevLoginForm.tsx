import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function DevLoginForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [username, setUsername] = useState("dev@orgflow.local");
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
    <div className="mx-auto mt-6 max-w-sm border border-border-subtle bg-surface p-6">
      <h2 className="text-lg font-semibold text-text-primary">Developer Login</h2>
      <p className="mt-1 text-sm text-text-secondary">
        Configure DEV_AUTH_USERNAME and DEV_AUTH_PASSWORD in .env.local
      </p>
      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-text-primary">Username</span>
          <input
            type="text"
            className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium text-text-primary">Password</span>
          <input
            type="password"
            className="border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-border-interactive"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? (
          <p className="border-l-4 border-danger bg-carbon-red-10 px-3 py-2 text-sm text-carbon-red-70">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="bg-carbon-blue-60 px-4 py-2 text-sm font-medium text-white hover:bg-carbon-blue-70 disabled:opacity-60 transition-colors"
        >
          {loading ? "Signing in..." : "Sign In (Dev)"}
        </button>
      </form>
    </div>
  );
}
