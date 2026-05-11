import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tile } from "@carbon/react";
import { useAuth } from "../context/AuthContext";
import { DevLoginForm } from "../components/DevLoginForm";

const isDevAuth = import.meta.env.VITE_DEV_AUTH === "true";

export function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
            background: "#0043ce",
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "#ffffff",
          }}
        >
          CP
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
          Club Portal
        </h1>
        <p
          style={{
            marginTop: "0.5rem",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--cds-text-secondary)",
          }}
        >
          Sign in with your Microsoft account to access the admin portal.
        </p>

        {isDevAuth ? (
          <div
            style={{
              marginTop: "1.5rem",
              borderTop: "1px solid var(--cds-border-subtle)",
              paddingTop: "1.5rem",
            }}
          >
            <DevLoginForm />
          </div>
        ) : null}
      </Tile>
    </div>
  );
}
