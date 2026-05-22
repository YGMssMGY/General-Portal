import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tile, Button, InlineNotification } from "@carbon/react";
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
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const dashboardPath = portal ? `/${portal}/dashboard` : "/";

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get("error");
        if (oauthError) {
            const messages: Record<string, string> = {
                AccessDenied: "You don't have access. Contact an admin to be whitelisted.",
                Configuration: "Authentication is not configured correctly.",
                OAuthCallbackError: "Authentication service encountered an error.",
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

    function goBack() {
        setPortal(null);
        document.title = "General Portal";
        document.querySelectorAll('link[rel*="icon"]').forEach((el) => el.remove());
        document.documentElement.style.removeProperty("--client-primary");
        document.documentElement.style.removeProperty("--client-secondary");
        navigate("/", { replace: true });
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
            <Tile
                style={{
                    maxWidth: "24rem",
                    width: "100%",
                    padding: "2rem",
                    position: "relative",
                }}
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
                        background: "#ffffff",
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
                        <span style={{ fontSize: "1.125rem", fontWeight: 600 }}>
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

                <div style={{ marginTop: "1.5rem" }}>
                    <Button
                        kind="tertiary"
                        style={{ width: "100%" }}
                        onClick={() => {
                            setLoading(true);
                            signIn("microsoft-entra-id", { redirect: true });
                        }}
                        disabled={loading}
                    >
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                justifyContent: "center",
                            }}
                        >
                            <svg viewBox="0 0 21 21" width="20" height="20">
                                <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                                <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                                <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                                <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                            </svg>
                            Sign in with Microsoft
                        </span>
                    </Button>
                </div>
            </Tile>
        </div>
    );
}
