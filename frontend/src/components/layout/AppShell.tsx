import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <Sidebar isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />
      {isSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/20 md:hidden"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
      <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
      <main className="min-h-screen pt-topbar-height md:ml-sidebar-width">
        <div className="scrollbar-soft h-[calc(100vh-64px)] overflow-y-auto p-4 md:p-gutter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
