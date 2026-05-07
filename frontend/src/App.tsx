import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { DemoAuthProvider } from "./context/DemoAuthContext";
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AppRoutes } from "./routes/AppRoutes";

export function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <DemoAuthProvider>
            <AuthProvider>
              <WorkspaceProvider>
                <AppRoutes />
              </WorkspaceProvider>
            </AuthProvider>
          </DemoAuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}