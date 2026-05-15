import { useMemo, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  HeaderContainer,
  Header,
  HeaderMenuButton,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
  Content,
} from "@carbon/react";
import { getClientConfig } from "../../config/clientConfig";
import {
  Dashboard,
  Document,
  Task,
  Calendar,
  User,
  Money,
  Chat,
  Folder,
  Group,
  Search,
  Activity,
  Settings,
  Launch,
  Asleep,
  Light,
} from "@carbon/icons-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { RoleSwitcher } from "../RoleSwitcher";
import type { ComponentType, ElementType } from "react";

interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<any>;
  end?: boolean;
  minRole?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navConfig: NavGroup[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", to: "/admin", icon: Dashboard, end: true },
      { label: "Search", to: "/admin/search", icon: Search },
    ],
  },
  {
    title: "Management",
    items: [
      { label: "Tasks", to: "/admin/tasks", icon: Task },
      { label: "Events", to: "/admin/events", icon: Calendar },
      { label: "Proposals", to: "/admin/proposals", icon: Document },
      { label: "Volunteers", to: "/admin/volunteers", icon: User },
      { label: "Finance", to: "/admin/finance", icon: Money, minRole: "officer" },
      { label: "Files", to: "/admin/files", icon: Folder },
    ],
  },
  {
    title: "Communication",
    items: [{ label: "Messages", to: "/admin/messages", icon: Chat }],
  },
  {
    title: "Administration",
    items: [
      { label: "Members", to: "/admin/members", icon: Group, minRole: "officer" },
      { label: "Activity", to: "/admin/activity", icon: Activity, minRole: "officer" },
      { label: "Settings", to: "/admin/settings", icon: Settings, minRole: "president" },
    ],
  },
];

const roleLevels: Record<string, number> = {
  admin: 4,
  president: 3,
  officer: 2,
  member: 1,
};

export function UIShell() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const config = useMemo(() => getClientConfig(), []);

  const userRoleLevel = useMemo(() => {
    return user?.role ? roleLevels[user.role] || 1 : 1;
  }, [user?.role]);

  const filteredConfig = useMemo(() => {
    return navConfig
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (!item.minRole) return true;
          return userRoleLevel >= (roleLevels[item.minRole] || 0);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [userRoleLevel]);

  function handleSearchSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && searchValue.trim()) {
      window.location.href = `/admin/search?q=${encodeURIComponent(searchValue.trim())}`;
      setSearchOpen(false);
      setSearchValue("");
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchValue("");
    }
  }

  return (
    <HeaderContainer
      render={({
        isSideNavExpanded,
        onClickSideNavExpand,
      }: {
        isSideNavExpanded: boolean;
        onClickSideNavExpand: () => void;
      }) => (
        <>
          <Header aria-label={config.displayName}>
            <SkipToContent />
            <HeaderMenuButton
              aria-label={isSideNavExpanded ? "Close menu" : "Open menu"}
              onClick={onClickSideNavExpand}
              isActive={isSideNavExpanded}
            />
            <HeaderName as={Link} to="/admin" prefix={config.shortName}>
              {config.displayName}
            </HeaderName>
            <HeaderGlobalBar>
              {searchOpen ? (
                <div className="cds--header__global">
                  <input
                    type="search"
                    placeholder="Search..."
                    className="cds--search-input"
                    style={{
                      height: "3rem",
                      width: "14rem",
                      border: "none",
                      background: "var(--cds-field)",
                      color: "var(--cds-text-primary)",
                      padding: "0 1rem",
                      fontSize: "0.875rem",
                      outline: "none",
                      borderBottom: "2px solid var(--cds-border-interactive)",
                    }}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    onBlur={() => {
                      if (!searchValue) setSearchOpen(false);
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <HeaderGlobalAction aria-label="Search" onClick={() => setSearchOpen(true)}>
                  <Search size={20} />
                </HeaderGlobalAction>
              )}
              <HeaderGlobalAction
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Light size={20} /> : <Asleep size={20} />}
              </HeaderGlobalAction>
              <div className="cds--header__global">
                <RoleSwitcher />
              </div>
            </HeaderGlobalBar>
            <SideNav
              aria-label="Side navigation"
              expanded={isSideNavExpanded}
              onOverlayClick={onClickSideNavExpand}
              isPersistent={false}
            >
              <SideNavItems>
                {filteredConfig.map((group) => (
                  <SideNavMenu key={group.title} title={group.title}>
                    {group.items.map((item) => {
                      const isActive = item.end
                        ? location.pathname === item.to
                        : location.pathname === item.to ||
                          location.pathname.startsWith(item.to + "/");
                      return (
                        <SideNavMenuItem
                          key={item.to}
                          as={Link as ElementType}
                          to={item.to}
                          isActive={isActive}
                          onClick={onClickSideNavExpand}
                        >
                          {item.label}
                        </SideNavMenuItem>
                      );
                    })}
                  </SideNavMenu>
                ))}
                <SideNavLink as={Link} to="/" renderIcon={Launch} onClick={onClickSideNavExpand}>
                  Public Site
                </SideNavLink>
              </SideNavItems>
            </SideNav>
          </Header>
          <Content id="main-content">
            <Outlet />
          </Content>
        </>
      )}
    />
  );
}
