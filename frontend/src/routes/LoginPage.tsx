import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
      <div className="border border-border-subtle bg-surface p-8 max-w-sm w-full text-center">
        <div className="flex h-12 w-12 items-center justify-center mx-auto bg-carbon-blue-60 text-lg font-semibold text-white">
          CP
        </div>
        <h1 className="mt-4 text-xl font-semibold text-text-primary">
          Club Portal
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Redirecting to the admin portal...
        </p>
      </div>
    </div>
  );
}
