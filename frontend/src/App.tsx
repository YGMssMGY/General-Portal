import { BrowserRouter } from "react-router-dom";
import { Theme } from "@carbon/react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppRoutes } from "./routes/AppRoutes";

function ThemedApp() {
  const { theme } = useTheme();
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
    </BrowserRouter>
  );
}
