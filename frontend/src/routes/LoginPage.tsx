import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="max-w-sm w-full border border-border-subtle bg-surface p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center bg-carbon-blue-60 text-lg font-semibold text-white">
          CP
        </div>
        <h1 className="mt-4 text-center text-xl font-semibold text-text-primary">
          Club Portal
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Sign in with your Microsoft account to access the admin portal.
        </p>

        {isDevAuth ? (
          <div className="mt-6 border-t border-border-subtle pt-6">
            <DevLoginForm />
          </div>
        ) : null}
      </div>
    </div>
  );
}
