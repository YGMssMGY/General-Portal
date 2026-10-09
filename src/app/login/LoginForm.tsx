"use client";

import Link from "next/link";
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
                    {providers.map((p) => (
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
            </div>
        </div>
    );
}
