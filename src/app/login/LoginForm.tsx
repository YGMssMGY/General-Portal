"use client";

import { signIn } from "next-auth/react";

interface LoginFormProps {
  portal: string;
  callbackUrl: string;
  error?: string | string[];
}

export default function LoginForm({ portal, callbackUrl, error }: LoginFormProps) {
  const portalName = portal === "developers" ? "Developers Club" : "Student Council";

  let errorMsg = "";
  if (typeof error === "string") {
    if (error === "OAuthSignin" || error === "OAuthCallback") {
      errorMsg = "There was a problem signing in with Microsoft. Please try again.";
    } else if (error === "AccessDenied") {
      errorMsg = "Access denied. Your email is not registered in this portal.";
    } else {
      errorMsg = "Authentication failed. Please try again.";
    }
  }

  function handleMicrosoftSignIn() {
    signIn("devconnect", { callbackUrl });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "24px",
        backgroundColor: "var(--color-bg-secondary)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          backgroundColor: "var(--color-bg)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-md)",
          padding: "40px 32px 32px",
        }}
      >
        <div style={{ marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            Sign in to {portalName}
          </h1>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-secondary)",
              marginTop: "8px",
              marginBottom: 0,
            }}
          >
            Use your school Microsoft account to sign in
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              backgroundColor: "#fff5f5",
              border: "1px solid var(--color-destructive)",
              borderRadius: "var(--radius-sm)",
              marginBottom: "20px",
              fontSize: "14px",
              color: "var(--color-destructive)",
              lineHeight: 1.4,
            }}
          >
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleMicrosoftSignIn}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            padding: "12px 24px",
            backgroundColor: "var(--color-primary)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "background-color 150ms ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 23 23" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022" />
            <rect x="12" y="1" width="9" height="9" fill="#7FBA00" />
            <rect x="1" y="12" width="9" height="9" fill="#00A4EF" />
            <rect x="12" y="12" width="9" height="9" fill="#FFB900" />
          </svg>
          Sign in with Microsoft
        </button>
      </div>
    </div>
  );
}
