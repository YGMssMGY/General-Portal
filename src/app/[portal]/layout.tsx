"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AuthSessionProvider, useAuthSession } from "@/components/AuthSessionProvider";
import { usePortal } from "@/hooks/usePortal";
import { useWorkspace } from "@/hooks/useWorkspace";
import { fetchJson } from "@/lib/api-client";
import { CommandPalette } from "@/components/CommandPalette";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { nav as workflowsNav } from "./workflows/nav";
import { nav as attendanceNav } from "./attendance/nav";
import { nav as participationNav } from "./participation/nav";
import { nav as pollsNav } from "./polls/nav";
import { nav as goalsNav } from "./goals/nav";
import { nav as decisionsNav } from "./decisions/nav";
import { duesNav } from "./dues/nav";
import { assetsNav } from "./assets/nav";
import { nav as kudosNav } from "./kudos/nav";
import { nav as trashNav } from "./trash/nav";
import { nav as reportsNav } from "./reports/nav";
import { nav as webhooksNav } from "./webhooks/nav";
import { nav as apiTokensNav } from "./api-tokens/nav";
import { nav as customFieldsNav } from "./custom-fields/nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import {
    Activity,
    Bell,
    Calendar,
    CalendarDays,
    ClipboardCheck,
    ClipboardList,
    DollarSign,
    Eye,
    File,
    FileBarChart,
    FileText,
    GitBranch,
    Handshake,
    HeartHandshake,
    KeyRound,
    LayoutDashboard,
    List,
    ListPlus,
    LogOut,
    Menu,
    MessageSquare,
    Moon,
    Package,
    PiggyBank,
    Receipt,
    Scale,
    Search,
    Settings,
    ShoppingCart,
    Sun,
    Target,
    Trash2,
    Trophy,
    UserCheck,
    Users,
    UsersRound,
    Video,
    Vote,
    Wallet,
    Webhook,
    X,
} from "lucide-react";

const EXTRA_NAV_ICONS: Record<string, typeof LayoutDashboard> = {
    GitBranch,
    ClipboardCheck,
    Trophy,
    FileBarChart,
    ListPlus,
    Webhook,
    KeyRound,
    Trash2,
    Vote,
    Target,
    Scale,
    Receipt,
    Package,
    HeartHandshake,
};

const EXTRA_NAV = [
    { ...workflowsNav, key: "workflows" },
    { ...attendanceNav, key: "attendance" },
    { ...participationNav, key: "participation" },
    { ...pollsNav, key: "polls" },
    { ...goalsNav, key: "goals" },
    { ...decisionsNav, key: "decisions" },
    { ...duesNav, key: "dues" },
    { ...assetsNav, key: "assets" },
    { ...kudosNav, key: "kudos" },
    { ...trashNav, key: "trash" },
    { ...reportsNav, key: "reports" },
    { ...webhooksNav, key: "webhooks" },
    { ...apiTokensNav, key: "apiTokens" },
    { ...customFieldsNav, key: "customFields" },
].map((item) => ({ ...item, icon: EXTRA_NAV_ICONS[item.icon] ?? List }));

const NAV_ICONS: Record<string, typeof LayoutDashboard> = {
    activity: Activity,
    bell: Bell,
    calendar: Calendar,
    "calendar-days": CalendarDays,
    "clipboard-list": ClipboardList,
    "dollar-sign": DollarSign,
    file: File,
    "file-text": FileText,
    handshake: Handshake,
    "layout-dashboard": LayoutDashboard,
    "message-square": MessageSquare,
    "piggy-bank": PiggyBank,
    search: Search,
    settings: Settings,
    "shopping-cart": ShoppingCart,
    "user-check": UserCheck,
    users: Users,
    "users-round": UsersRound,
    video: Video,
    wallet: Wallet,
};

const NAV_KEY_BY_PATH: Record<string, string> = {
    "/activity": "activity",
    "/budget": "budget",
    "/calendar": "calendar",
    "/cooperation": "cooperation",
    "/partnerships": "partnerships",
    "/dashboard": "dashboard",
    "/my-work": "myWork",
    "/onboarding": "onboarding",
    "/invitations": "invitations",
    "/analytics": "analytics",
    "/events": "events",
    "/files": "files",
    "/finance": "finance",
    "/meetings": "meetings",
    "/members": "members",
    "/messages": "messages",
    "/notifications": "notifications",
    "/proposals": "proposals",
    "/search": "search",
    "/settings": "settings",
    "/subgroups": "subgroups",
    "/tasks": "tasks",
    "/volunteers": "volunteers",
};

interface RenderNavItem {
    key: string;
    path: string;
    icon: typeof LayoutDashboard;
    customLabel?: string;
    module: string;
}

interface SearchResultItem {
    id: string;
    title: string;
    snippet: string;
    type: string;
    url: string;
}

interface SearchResponse {
    results: SearchResultItem[];
    total: number;
}

function SearchDropdown({ portal }: { portal: string }) {
    const router = useRouter();
    const tSearch = useTranslations("search");
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const { data, isLoading } = useQuery<SearchResponse>({
        queryKey: [portal, "search-preview", debouncedQuery],
        queryFn: () =>
            fetchJson<SearchResponse>(`/api/search?q=${encodeURIComponent(debouncedQuery)}`),
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
            className="hidden sm:flex"
            style={{
                alignItems: "center",
                flex: 1,
                maxWidth: "400px",
                margin: "0 16px",
                position: "relative",
            }}
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
            <Input
                placeholder={tSearch("placeholder")}
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value);
                    if (e.target.value.trim()) setOpen(true);
                }}
                onFocus={() => {
                    if (query.trim()) setOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && query.trim()) {
                        handleSelect(`/${portal}/search?q=${encodeURIComponent(query.trim())}`);
                    }
                }}
                style={{ width: "100%", paddingLeft: "36px" }}
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
                            {tSearch("placeholder")}...
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
                            {tSearch("noResults")}
                        </div>
                    )}
                    {!isLoading &&
                        results.slice(0, 5).map((item) => (
                            <button
                                key={`${item.type}-${item.id}`}
                                type="button"
                                onClick={() => handleSelect(item.url)}
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
                            >
                                <span
                                    style={{
                                        flex: 1,
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                >
                                    {item.title}
                                </span>
                                <Badge variant="secondary">{item.type}</Badge>
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}

function PortalLayoutContent({ children }: { children: ReactNode }) {
    const { user, status } = useAuthSession();
    const portal = usePortal();
    const { data: workspace } = useWorkspace();
    const params = useParams();
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const tNav = useTranslations("nav");
    const tCommon = useTranslations("common");
    const tProd = useTranslations("productivity");

    const { data: prefs } = useQuery<{ widgets: string[]; theme: string; density: string }>({
        queryKey: [portal, "prefs"],
        queryFn: () =>
            fetchJson<{ widgets: string[]; theme: string; density: string }>("/api/me/prefs"),
        enabled: portal !== "" && status === "authenticated",
    });

    useEffect(() => {
        if (!prefs) return;
        const theme =
            prefs.theme === "system"
                ? window.matchMedia("(prefers-color-scheme: dark)").matches
                    ? "dark"
                    : "light"
                : prefs.theme;
        document.documentElement.dataset.theme = theme;
        document.documentElement.dataset.density = prefs.density;
    }, [prefs]);

    const prefsMutation = useMutation({
        mutationFn: (body: { theme?: string; density?: string }) =>
            fetchJson<{ widgets: string[]; theme: string; density: string }>("/api/me/prefs", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            }),
        onSuccess: (next) => {
            queryClient.setQueryData([portal, "prefs"], next);
        },
    });

    const dark = prefs?.theme === "dark";
    function toggleTheme() {
        prefsMutation.mutate({ theme: dark ? "light" : "dark" });
    }
    function toggleDensity() {
        prefsMutation.mutate({ density: prefs?.density === "compact" ? "comfortable" : "compact" });
    }

    const isPortalValid = portal !== "";
    const displayName = workspace?.name ?? portal;

    useEffect(() => {
        const cookiePortal =
            typeof document === "undefined"
                ? ""
                : (document.cookie.match(/(?:^|;\s*)portal=([^;]*)/)?.[1]?.trim() ?? "");
        if (cookiePortal === "") {
            router.replace("/");
        }
    }, [router, pathname]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login");
        }
    }, [status, router]);

    useEffect(() => {
        const urlPortal = params?.portal;
        if (typeof urlPortal === "string" && urlPortal !== "" && urlPortal !== portal) {
            document.cookie = `portal=${urlPortal}; path=/; SameSite=Lax`;
        }
    }, [params, portal]);

    const handleSignOut = useCallback(async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } catch {
            void 0;
        }
        router.push("/login");
    }, [router]);

    const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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
                {tCommon("loading")}...
            </div>
        );
    }

    const settings = workspace?.settings ?? {};
    const modules = workspace?.modules ?? [];
    const yamlNav = (workspace?.nav ?? []).map((item) => {
        const key = NAV_KEY_BY_PATH[item.path];
        const customLabel = key ? tNav(key) : item.label;
        return {
            key: key ?? "",
            path: item.path,
            icon: NAV_ICONS[item.icon] ?? List,
            customLabel,
            module: item.module,
        };
    });
    const visibleItems = yamlNav.filter(
        (item) =>
            settings[item.module] !== false &&
            (modules.length === 0 || modules.includes(item.module)),
    );
    const yamlPaths = new Set((workspace?.nav ?? []).map((item) => item.path));
    const visibleExtra = EXTRA_NAV.filter(
        (item) => !yamlPaths.has(item.path) && settings[item.module] !== false,
    );
    const showShowcase = user?.role !== "member" && settings["showcase"] !== false;

    const primary = workspace?.branding?.primary;
    const validPrimary = primary && /^#[0-9a-fA-F]{6}$/.test(primary) ? primary : undefined;
    const rawRadius = workspace?.radius;
    const radius = typeof rawRadius === "number" ? Math.max(0, Math.min(32, rawRadius)) : undefined;
    const brandingStyle = {
        ...(validPrimary ? { "--color-primary": validPrimary } : {}),
        ...(radius !== undefined
            ? {
                  "--radius-sm": `${radius}px`,
                  "--radius-md": `${radius}px`,
                  "--radius-lg": `${radius}px`,
              }
            : {}),
    } as CSSProperties;

    function renderNavLink(item: RenderNavItem, onNavigate?: () => void) {
        const Icon = item.icon;
        const href = `/${portal}${item.path}`;
        const isActive = pathname === href;
        return (
            <Link
                key={item.path}
                href={href}
                onClick={onNavigate}
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
                    marginBottom: "2px",
                    minHeight: "40px",
                }}
            >
                <Icon size={18} style={{ flexShrink: 0 }} />
                <span>{item.customLabel ?? tNav(item.key)}</span>
            </Link>
        );
    }

    const showcaseHref = `/${portal}/showcase-admin`;
    const showcaseActive = pathname === showcaseHref;

    return (
        <div style={brandingStyle}>
            <div
                style={{
                    display: "flex",
                    height: "100dvh",
                    overflow: "hidden",
                    backgroundColor: "var(--color-bg)",
                }}
            >
                <Toaster />
                <CommandPalette />
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
                        <p
                            style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "var(--color-text-secondary)",
                                margin: 0,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            {displayName}
                        </p>
                    </div>
                    <nav style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                        {visibleItems.map((item) => renderNavLink(item))}
                        {visibleExtra.map((item) => renderNavLink(item))}
                        {showShowcase && (
                            <Link
                                href={showcaseHref}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    padding: "10px 12px",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "14px",
                                    fontWeight: showcaseActive ? 600 : 400,
                                    color: showcaseActive
                                        ? "var(--color-primary)"
                                        : "var(--color-text)",
                                    backgroundColor: showcaseActive
                                        ? "var(--color-primary-light)"
                                        : "transparent",
                                    textDecoration: "none",
                                    marginBottom: "2px",
                                    minHeight: "40px",
                                }}
                            >
                                <Eye size={18} style={{ flexShrink: 0 }} />
                                <span>{tNav("showcase")}</span>
                            </Link>
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
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="flex md:hidden"
                                onClick={() => setSidebarOpen(true)}
                                aria-label="Open navigation menu"
                            >
                                <Menu size={20} />
                            </Button>
                            <span
                                style={{
                                    fontSize: "16px",
                                    fontWeight: 600,
                                    color: "var(--color-text)",
                                }}
                            >
                                {displayName}
                            </span>
                        </div>
                        <SearchDropdown portal={portal} />
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={toggleTheme}
                                aria-label={tProd("theme")}
                            >
                                {dark ? <Sun size={16} /> : <Moon size={16} />}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={toggleDensity}
                                aria-label={tProd("density")}
                            >
                                <List size={16} />
                            </Button>
                            {user?.name && (
                                <span
                                    className="hidden sm:inline"
                                    style={{
                                        fontSize: "14px",
                                        color: "var(--color-text-secondary)",
                                    }}
                                >
                                    {user.name}
                                </span>
                            )}
                            <Avatar style={{ width: "32px", height: "32px" }}>
                                {user?.image && (
                                    <AvatarImage
                                        src={user.image}
                                        alt={user.name ?? "User avatar"}
                                    />
                                )}
                                <AvatarFallback>
                                    {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
                                </AvatarFallback>
                            </Avatar>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleSignOut}
                                aria-label={tCommon("signOut")}
                            >
                                <LogOut size={15} />
                                <span className="hidden sm:inline">{tCommon("signOut")}</span>
                            </Button>
                        </div>
                    </header>
                    <AnnouncementBanner />
                    <main
                        style={{ flex: 1, overflowY: "auto", padding: "var(--density-pad, 24px)" }}
                    >
                        {children}
                    </main>
                </div>

                {sidebarOpen && (
                    <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
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
                                        {displayName}
                                    </h2>
                                    {user?.email && (
                                        <p
                                            style={{
                                                fontSize: "12px",
                                                color: "var(--color-text-secondary)",
                                                margin: "4px 0 0",
                                            }}
                                        >
                                            {user.email}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={closeSidebar}
                                    aria-label={tCommon("close")}
                                >
                                    <X size={20} />
                                </Button>
                            </div>
                            <nav style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                                {visibleItems.map((item) => renderNavLink(item, closeSidebar))}
                                {visibleExtra.map((item) => renderNavLink(item, closeSidebar))}
                                {showShowcase && (
                                    <Link
                                        href={showcaseHref}
                                        onClick={closeSidebar}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "10px",
                                            padding: "12px",
                                            borderRadius: "var(--radius-sm)",
                                            fontSize: "14px",
                                            fontWeight: showcaseActive ? 600 : 400,
                                            color: showcaseActive
                                                ? "var(--color-primary)"
                                                : "var(--color-text)",
                                            backgroundColor: showcaseActive
                                                ? "var(--color-primary-light)"
                                                : "transparent",
                                            textDecoration: "none",
                                            marginBottom: "2px",
                                            minHeight: "48px",
                                        }}
                                    >
                                        <Eye size={18} style={{ flexShrink: 0 }} />
                                        <span>{tNav("showcase")}</span>
                                    </Link>
                                )}
                            </nav>
                        </aside>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function PortalLayout({ children }: { children: ReactNode }) {
    return (
        <AuthSessionProvider>
            <PortalLayoutContent>{children}</PortalLayoutContent>
        </AuthSessionProvider>
    );
}
