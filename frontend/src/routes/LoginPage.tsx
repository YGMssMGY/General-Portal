import { LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-md rounded-lg border border-outline-variant bg-surface-container-lowest p-8 shadow-panel">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-on-primary">OF</div>
          <div>
            <h1 className="font-display text-xl font-bold text-on-surface">OrgFlow Workspace</h1>
            <p className="text-sm text-on-surface-variant">Sign in with your organization account.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={login}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition hover:bg-primary-container"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Continue with Microsoft
        </button>
      </section>
    </main>
  );
}
