import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { SideNav } from "./SideNav";

export function UIShell() {
  const [isSideNavOpen, setIsSideNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <SideNav
        isOpen={isSideNavOpen}
        onNavigate={() => setIsSideNavOpen(false)}
      />
      {isSideNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setIsSideNavOpen(false)}
        />
      ) : null}
      <Header
        onMenuClick={() => setIsSideNavOpen((prev) => !prev)}
        isSideNavOpen={isSideNavOpen}
      />
      <main className="pt-12 lg:ml-64">
        <div className="scrollbar-soft h-[calc(100vh-3rem)] overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
