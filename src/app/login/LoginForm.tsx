"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/api-client";

interface ProvidersResponse {
    providers: Array<{ id: string }>;
    workspace: { slug: string; name: string };
}

const labelKeys: Record<string, string> = {
    "microsoft-entra-id": "signInWithMicrosoft",
    "basis-auth": "signInWithBasisAuth",
    oidc: "signInWithOidc",
    saml: "signInWithSaml",
    google: "signInWithGoogle",
    github: "signInWithGithub",
};

const errorBox: React.CSSProperties = {
    padding: "12px 16px",
    backgroundColor: "#fff5f5",
    border: "1px solid var(--color-destructive)",
    borderRadius: "var(--radius-sm)",
    marginBottom: "20px",
    fontSize: "14px",
    color: "var(--color-destructive)",
    lineHeight: 1.4,
};

export default function LoginForm({
    portal,
    error,
    callbackUrl,
}: {
    portal: string;
    error?: string;
    callbackUrl?: string;
}) {
    const t = useTranslations("auth");
    const tc = useTranslations("common");
    const te = useTranslations("errors");

    const { data, isLoading, isError, refetch } = useQuery<ProvidersResponse>({
        queryKey: ["auth", "providers", portal],
        queryFn: () =>
            fetchJson<ProvidersResponse>(
                `/api/auth/providers?portal=${encodeURIComponent(portal)}`,
            ),
    });

    const providers = data?.providers ?? [];
    const workspaceName = data?.workspace.name ?? portal;

    const [mode, setMode] = useState<"signin" | "request" | "confirm">("signin");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [formError, setFormError] = useState("");
    const [formNotice, setFormNotice] = useState("");
    const [busy, setBusy] = useState(false);

    async function postForm(url: string, body: unknown): Promise<string | null> {
        setBusy(true);
        setFormError("");
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            let json: { success?: boolean; error?: string } = {};
            try {
                json = (await res.json()) as { success?: boolean; error?: string };
            } catch {
                return te("internal");
            }
            if (res.ok && json.success) return null;
            return typeof json.error === "string" && json.error !== ""
                ? json.error
                : te("internal");
        } catch {
            return te("internal");
        } finally {
            setBusy(false);
        }
    }

    async function submitResetRequest() {
        const err = await postForm("/api/auth/password/reset-request", { email, portal });
        if (err) {
            setFormError(err);
            return;
        }
        setFormNotice(t("codeSent"));
        setMode("confirm");
    }

    async function submitResetConfirm() {
        if (newPassword.length < 12) {
            setFormError(t("passwordTooShort"));
            return;
        }
        const err = await postForm("/api/auth/password/reset-confirm", {
            email,
            code,
            newPassword,
        });
        if (err) {
            setFormError(err);
            return;
        }
        setFormNotice(t("resetSuccess"));
        setMode("signin");
        setCode("");
        setNewPassword("");
    }

    function resetState() {
        setMode("signin");
        setFormError("");
        setFormNotice("");
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
                        {t("signInTo", { name: workspaceName })}
                    </h1>
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            marginTop: "8px",
                            marginBottom: 0,
                        }}
                    >
                        {t("signInSubtitle")}
                    </p>
                </div>

                {error === "AccessDenied" && (
                    <div role="alert" style={errorBox}>
                        {t("notAMember")}
                    </div>
                )}
                {error !== undefined && error !== "AccessDenied" && (
                    <div role="alert" style={errorBox}>
                        {te("internal")}
                    </div>
                )}

                {isLoading && (
                    <p
                        style={{
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            margin: "0 0 20px",
                        }}
                    >
                        {tc("loading")}
                    </p>
                )}

                {!isLoading && isError && (
                    <div style={{ marginBottom: "20px" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-destructive)",
                                margin: "0 0 12px",
                            }}
                        >
                            {te("internal")}
                        </p>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            style={{
                                padding: "8px 16px",
                                backgroundColor: "var(--color-bg)",
                                color: "var(--color-primary)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "14px",
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                            }}
                        >
                            {tc("retry")}
                        </button>
                    </div>
                )}

                {!isLoading && !isError && providers.length === 0 && (
                    <div style={{ marginBottom: "20px" }}>
                        <p
                            style={{
                                fontSize: "14px",
                                color: "var(--color-text)",
                                margin: "0 0 4px",
                            }}
                        >
                            {t("noProvidersConfigured")}
                        </p>
                        <p
                            style={{
                                fontSize: "13px",
                                color: "var(--color-text-secondary)",
                                margin: 0,
                            }}
                        >
                            {t("contactAdmin")}
                        </p>
                    </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {mode === "signin" &&
                        providers.map((p) => (
                            <Link
                                key={p.id}
                                href={
                                    callbackUrl
                                        ? `/api/auth/login/${p.id}?callbackUrl=${encodeURIComponent(callbackUrl)}`
                                        : `/api/auth/login/${p.id}`
                                }
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
                                    textDecoration: "none",
                                    transition: "background-color 150ms ease",
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor =
                                        "var(--color-primary-hover)";
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor =
                                        "var(--color-primary)";
                                }}
                            >
                                {t(labelKeys[p.id] ?? "signInWith", { provider: p.id })}
                            </Link>
                        ))}
                </div>
                {formNotice !== "" && (
                    <p
                        role="status"
                        style={{
                            fontSize: "13px",
                            color: "var(--color-success-text)",
                            margin: "12px 0 0",
                        }}
                    >
                        {formNotice}
                    </p>
                )}
                {formError !== "" && (
                    <p
                        role="alert"
                        style={{
                            fontSize: "13px",
                            color: "var(--color-destructive)",
                            margin: "12px 0 0",
                        }}
                    >
                        {formError}
                    </p>
                )}
                {mode === "signin" && (
                    <button
                        type="button"
                        onClick={() => {
                            setMode("request");
                            setFormError("");
                            setFormNotice("");
                        }}
                        style={{
                            marginTop: "16px",
                            padding: 0,
                            background: "none",
                            border: "none",
                            fontSize: "13px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            color: "var(--color-primary)",
                        }}
                    >
                        {t("forgotPassword")}
                    </button>
                )}
                {mode === "request" && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            marginTop: "16px",
                        }}
                    >
                        <h2
                            style={{
                                fontSize: "15px",
                                fontWeight: 600,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {t("resetTitle")}
                        </h2>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("email")}
                            autoComplete="email"
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                fontSize: "14px",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--color-bg)",
                                color: "var(--color-text)",
                                fontFamily: "inherit",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={submitResetRequest}
                                disabled={email.trim() === "" || busy}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "var(--color-primary)",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                    opacity: email.trim() === "" ? 0.5 : 1,
                                }}
                            >
                                {t("sendCode")}
                            </button>
                            <button
                                type="button"
                                onClick={resetState}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                }}
                            >
                                {t("backToSignIn")}
                            </button>
                        </div>
                    </div>
                )}
                {mode === "confirm" && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            marginTop: "16px",
                        }}
                    >
                        <h2
                            style={{
                                fontSize: "15px",
                                fontWeight: 600,
                                color: "var(--color-text)",
                                margin: 0,
                            }}
                        >
                            {t("resetTitle")}
                        </h2>
                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder={t("resetCode")}
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                fontSize: "14px",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--color-bg)",
                                color: "var(--color-text)",
                                fontFamily: "inherit",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                        <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder={t("newPassword")}
                            autoComplete="new-password"
                            style={{
                                width: "100%",
                                padding: "10px 12px",
                                fontSize: "14px",
                                border: "1px solid var(--color-border)",
                                borderRadius: "var(--radius-sm)",
                                backgroundColor: "var(--color-bg)",
                                color: "var(--color-text)",
                                fontFamily: "inherit",
                                outline: "none",
                                boxSizing: "border-box",
                            }}
                        />
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button
                                type="button"
                                onClick={submitResetConfirm}
                                disabled={code.trim() === "" || newPassword === "" || busy}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "var(--color-primary)",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                }}
                            >
                                {t("resetPassword")}
                            </button>
                            <button
                                type="button"
                                onClick={resetState}
                                style={{
                                    padding: "10px 20px",
                                    backgroundColor: "var(--color-bg)",
                                    color: "var(--color-text)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                }}
                            >
                                {t("backToSignIn")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
