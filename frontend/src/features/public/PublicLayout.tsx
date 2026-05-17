import { Outlet, Link } from "react-router-dom";
import { Button } from "@carbon/react";
import { getClientConfig } from "../../config/clientConfig";

const navLinkStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontSize: "0.875rem",
  color: "var(--cds-text-secondary)",
  textDecoration: "none",
};

export function PublicLayout() {
  const config = getClientConfig();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--cds-background)",
        color: "var(--cds-text-primary)",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          borderBottom: "1px solid var(--cds-border-subtle)",
          background: "var(--cds-layer)",
        }}
      >
        <div
          style={{
            margin: "0 auto",
            maxWidth: "80rem",
            display: "flex",
            height: "3.5rem",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 1rem",
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              color: "var(--cds-text-primary)",
              textDecoration: "none",
            }}
          >
            {config.favicon ? (
              <img
                src={config.favicon}
                alt={config.shortName}
                style={{ width: "2rem", height: "2rem", borderRadius: "2px" }}
              />
            ) : (
              <div
                style={{
                  width: "2rem",
                  height: "2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#0043ce",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#ffffff",
                }}
              >
                {config.shortName}
              </div>
            )}
            <span style={{ fontSize: "1.125rem", fontWeight: 600 }}>{config.displayName}</span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <Link to="/" style={navLinkStyle}>
                Home
              </Link>
              <Link to="/events" style={navLinkStyle}>
                Events
              </Link>
              <Link to="/photos" style={navLinkStyle}>
                Photos
              </Link>
              <Link to="/about" style={navLinkStyle}>
                About
              </Link>
              <Link to="/login" style={{ marginLeft: "0.5rem" }}>
                <Button kind="tertiary" size="sm">
                  Sign In
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <footer
        style={{ borderTop: "1px solid var(--cds-border-subtle)", background: "var(--cds-layer)" }}
      >
        <div style={{ margin: "0 auto", maxWidth: "80rem", padding: "2rem 1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary)" }}>
            &copy; {new Date().getFullYear()} {config.displayName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
