"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { SessionProvider } from "@/components/SessionProvider";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Calendar,
  MessageSquare,
  DollarSign,
  Users,
  UserCheck,
  File,
  Video,
  Activity,
  Search,
  UserCog,
  Settings,
  Bell,
  Wallet,
  Menu,
  LogOut,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Proposals", path: "/proposals", icon: FileText },
  { label: "Tasks", path: "/tasks", icon: ClipboardList },
  { label: "Events", path: "/events", icon: Calendar },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Finance", path: "/finance", icon: DollarSign },
  { label: "Volunteers", path: "/volunteers", icon: Users },
  { label: "Members", path: "/members", icon: UserCheck },
  { label: "Files", path: "/files", icon: File },
  { label: "Meetings", path: "/meetings", icon: Video },
  { label: "Activity", path: "/activity", icon: Activity },
  { label: "Search", path: "/search", icon: Search },
  { label: "Accounts", path: "/accounts", icon: UserCog },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Notifications", path: "/notifications", icon: Bell },
  { label: "Budget", path: "/budget", icon: Wallet },
] as const;

function getPortalCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)portal=([^;]*)/);
  return match?.[1] ?? null;
}

function PortalLayoutContent({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const urlPortal = params?.portal as string;
  const portal = getPortalCookie();
  const isPortalValid = portal === "developers" || portal === "stuco";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isPortalValid) {
      router.replace("/");
    }
  }, [isPortalValid, router]);

  useEffect(() => {
    if (mounted && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [mounted, status, router]);

  useEffect(() => {
    if (urlPortal && portal && urlPortal !== portal) {
      document.cookie = `portal=${urlPortal}; path=/; SameSite=Lax`;
    }
  }, [urlPortal, portal]);

  const portalName = portal === "developers" ? "Developers Club" : "Student Council";

  const handleSignOut = useCallback(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  if (!mounted || status === "loading" || !isPortalValid) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          color: "var(--color-text-secondary)",
          fontSize: "14px",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100dvh", backgroundColor: "var(--color-bg)" }}>
      <aside
        className="hidden md:flex"
        style={{
          width: "240px",
          flexShrink: 0,
          flexDirection: "column",
          borderRight: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "20px 16px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              color: "var(--color-text)",
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            {portalName}
          </h2>
          {session?.user?.email && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-text-secondary)",
                margin: "4px 0 0",
              }}
            >
              {session.user.email}
            </p>
          )}
        </div>

        <nav
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px",
          }}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const href = `/${portal}${item.path}`;
            const isActive = pathname === href;

            return (
              <a
                key={item.path}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(href);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "14px",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "var(--color-primary)" : "var(--color-text)",
                  backgroundColor: isActive ? "var(--color-primary-light)" : "transparent",
                  textDecoration: "none",
                  transition: "background-color 100ms ease",
                  marginBottom: "2px",
                  minHeight: "40px",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "56px",
            padding: "0 16px",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              className="flex md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "transparent",
                cursor: "pointer",
                color: "var(--color-text)",
              }}
            >
              <Menu size={20} />
            </button>

            <span
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--color-text)",
              }}
            >
              {portalName}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {session?.user?.name && (
              <span
                className="hidden sm:inline"
                style={{
                  fontSize: "14px",
                  color: "var(--color-text-secondary)",
                }}
              >
                {session.user.name}
              </span>
            )}

            {session?.user?.image && (
              <img
                src={session.user.image}
                alt={session.user.name ?? "User avatar"}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            )}

            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 12px",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "transparent",
                cursor: "pointer",
                color: "var(--color-text-secondary)",
                fontSize: "13px",
                fontWeight: 500,
                fontFamily: "inherit",
                transition: "background-color 100ms ease, color 100ms ease",
                minHeight: "36px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
                e.currentTarget.style.color = "var(--color-destructive)";
                e.currentTarget.style.borderColor = "var(--color-destructive)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--color-text-secondary)";
                e.currentTarget.style.borderColor = "var(--color-border)";
              }}
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {children}
        </main>
      </div>

      {sidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
          }}
        >
          <div
            onClick={closeSidebar}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            }}
          />

          <aside
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "280px",
              height: "100%",
              backgroundColor: "var(--color-bg)",
              display: "flex",
              flexDirection: "column",
              zIndex: 10,
              animation: "slideIn 200ms ease-out",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "var(--color-text)",
                    margin: 0,
                  }}
                >
                  {portalName}
                </h2>
                {session?.user?.email && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--color-text-secondary)",
                      margin: "4px 0 0",
                    }}
                  >
                    {session.user.email}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close navigation menu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "40px",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: "var(--color-text)",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <nav
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px",
              }}
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const href = `/${portal}${item.path}`;
                const isActive = pathname === href;

                return (
                  <a
                    key={item.path}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(href);
                      closeSidebar();
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "12px 12px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "14px",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "var(--color-primary)" : "var(--color-text)",
                      backgroundColor: isActive ? "var(--color-primary-light)" : "transparent",
                      textDecoration: "none",
                      transition: "background-color 100ms ease",
                      marginBottom: "2px",
                      minHeight: "48px",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <Icon size={18} style={{ flexShrink: 0 }} />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <PortalLayoutContent>{children}</PortalLayoutContent>
    </SessionProvider>
  );
}
