"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession, signOut } from "next-auth/react";
import { SessionProvider } from "@/components/SessionProvider";
import { fetchJson } from "@/lib/api-client";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  CalendarDays,
  Calendar,
  MessageSquare,
  DollarSign,
  Users,
  UserCheck,
  File,
  Video,
  Activity,
  Settings,
  Bell,
  Menu,
  LogOut,
  X,
  Handshake,
  UsersRound,
  Search,
  Eye,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Proposals", path: "/proposals", icon: FileText },
  { label: "Tasks", path: "/tasks", icon: ClipboardList },
  { label: "Calendar", path: "/calendar", icon: CalendarDays },
  { label: "Events", path: "/events", icon: Calendar },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Finance", path: "/finance", icon: DollarSign },
  { label: "Volunteers", path: "/volunteers", icon: Users },
  { label: "Members", path: "/members", icon: UserCheck },
  { label: "Files & Links", path: "/files", icon: File },
  { label: "Meetings", path: "/meetings", icon: Video },
  { label: "Activity", path: "/activity", icon: Activity },
  { label: "Subgroups", path: "/subgroups", icon: UsersRound },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Cooperation", path: "/cooperation", icon: Handshake },
  { label: "Notifications", path: "/notifications", icon: Bell },
] as const;

interface SearchResultItem {
  id: string;
  title: string;
  type: string;
  portal: string;
  url: string;
}

interface SearchResponse {
  results: SearchResultItem[];
  total: number;
}

function SearchDropdown({ portal, router }: { portal: string; router: ReturnType<typeof useRouter> }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: [portal, "search-preview", debouncedQuery],
    queryFn: () => fetchJson<SearchResponse>(`/api/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.trim().length > 0,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const results = data?.results ?? [];
  const showDropdown = open && query.trim().length > 0;

  function handleSelect(url: string) {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    router.push(url);
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flex: 1,
        maxWidth: "400px",
        margin: "0 16px",
        position: "relative",
      }}
      className="hidden sm:flex"
    >
      <Search
        size={16}
        style={{
          position: "absolute",
          left: "12px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--color-text-secondary)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <input
        ref={inputRef}
        placeholder="Search..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (e.target.value.trim()) setOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        style={{
          width: "100%",
          padding: "8px 12px 8px 36px",
          fontSize: "13px",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)",
          backgroundColor: "var(--color-bg-secondary)",
          color: "var(--color-text)",
          fontFamily: "inherit",
          outline: "none",
          minHeight: "36px",
        }}
      />

      {showDropdown && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "5px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            zIndex: 100,
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {isLoading && (
            <div
              style={{
                padding: "12px 16px",
                fontSize: "13px",
                color: "var(--color-text-secondary)",
              }}
            >
              Searching...
            </div>
          )}

          {!isLoading && results.length === 0 && debouncedQuery.trim() && (
            <div
              style={{
                padding: "12px 16px",
                fontSize: "13px",
                color: "var(--color-text-secondary)",
              }}
            >
              No results found
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <>
              {results.slice(0, 5).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.url || `/${portal}/search?q=${encodeURIComponent(query)}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    borderBottom: "1px solid var(--color-border)",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textAlign: "left",
                    fontSize: "13px",
                    color: "var(--color-text)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.title}
                  </span>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      backgroundColor: "var(--color-bg-secondary)",
                      color: "var(--color-text-secondary)",
                      flexShrink: 0,
                    }}
                  >
                    {item.type}
                  </span>
                  {item.portal && item.portal !== portal && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        backgroundColor: "var(--color-primary-light)",
                        color: "var(--color-primary)",
                        flexShrink: 0,
                      }}
                    >
                      {item.portal}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

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

  const urlPortal = params?.portal as string;
  const portal = getPortalCookie();
  const isPortalValid = portal === "developers" || portal === "stuco";

  useEffect(() => {
    if (!isPortalValid) {
      router.replace("/");
    }
  }, [isPortalValid, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (urlPortal && portal && urlPortal !== portal) {
      document.cookie = `portal=${urlPortal}; path=/; SameSite=Lax`;
    }
  }, [urlPortal, portal]);

  const portalName = portal === "developers" ? "Developers' Club" : "Student Council";

  const handleSignOut = useCallback(() => {
    signOut({ callbackUrl: "/" });
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  if (status === "loading" || !isPortalValid) {
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
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", backgroundColor: "var(--color-bg)" }}>
      <aside
        className="hidden md:flex"
        style={{
          width: "240px",
          flexShrink: 0,
          flexDirection: "column",
          borderRight: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg)",
          height: "100dvh",
          position: "sticky",
          top: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "12px 16px 4px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-secondary)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {portalName}
          </p>
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
          {session?.user?.role !== "member" && (
            <a
              href={`/${portal}/showcase-admin`}
              onClick={(e) => { e.preventDefault(); router.push(`/${portal}/showcase-admin`); }}
              style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                borderRadius: "var(--radius-sm)", fontSize: "14px", fontWeight: 400,
                color: pathname === `/${portal}/showcase-admin` ? "var(--color-primary)" : "var(--color-text)",
                backgroundColor: pathname === `/${portal}/showcase-admin` ? "var(--color-primary-light)" : "transparent",
                textDecoration: "none", marginBottom: "2px", minHeight: "40px",
              }}
              onMouseEnter={(e) => { if (pathname !== `/${portal}/showcase-admin`) e.currentTarget.style.backgroundColor = "var(--color-bg-secondary)"; }}
              onMouseLeave={(e) => { if (pathname !== `/${portal}/showcase-admin`) e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <Eye size={18} style={{ flexShrink: 0 }} />
              <span>Showcase</span>
            </a>
          )}
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

          <SearchDropdown portal={portal} router={router} />

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
              // eslint-disable-next-line @next/next/no-img-element
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
