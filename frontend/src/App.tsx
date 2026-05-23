import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { Theme } from "@carbon/react";
import { signOut } from "@hono/auth-js/react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppRoutes } from "./routes/AppRoutes";
import { useClientTheme } from "./hooks/useClientTheme";
import { useWebVitals } from "./hooks/useWebVitals";

function ThemedApp() {
    const { theme } = useTheme();
    const navigate = useNavigate();
    useClientTheme();
    useWebVitals();

    useEffect(() => {
        function onUnauthorized() {
            signOut({ redirect: false });
            navigate("/login");
        }
        window.addEventListener("auth:unauthorized", onUnauthorized);
        return () => window.removeEventListener("auth:unauthorized", onUnauthorized);
    }, [navigate]);

    return (
        <Theme theme={theme === "dark" ? "g100" : "g10"}>
            <WorkspaceProvider>
                <AppRoutes />
            </WorkspaceProvider>
        </Theme>
    );
}

export function App() {
    return (
        <BrowserRouter>
            <ErrorBoundary>
                <ThemeProvider>
                    <ThemedApp />
                </ThemeProvider>
            </ErrorBoundary>
            <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </BrowserRouter>
    );
}
