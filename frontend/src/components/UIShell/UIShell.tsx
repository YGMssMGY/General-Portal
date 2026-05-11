import { useState } from "react";
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
  SkipToContent,
  Content,
} from "@carbon/react";
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
  Close,
} from "@carbon/icons-react";
import { useTheme } from "../../context/ThemeContext";
import { RoleSwitcher } from "../RoleSwitcher";

const navItems = [
  { label: "Dashboard", to: "/admin", icon: Dashboard, end: true },
  { label: "Proposals", to: "/admin/proposals", icon: Document },
  { label: "Tasks", to: "/admin/tasks", icon: Task },
  { label: "Events", to: "/admin/events", icon: Calendar },
  { label: "Volunteers", to: "/admin/volunteers", icon: User },
  { label: "Finance", to: "/admin/finance", icon: Money },
  { label: "Messages", to: "/admin/messages", icon: Chat },
  { label: "Files", to: "/admin/files", icon: Folder },
  { label: "Members", to: "/admin/members", icon: Group },
  { label: "Search", to: "/admin/search", icon: Search },
  { label: "Activity", to: "/admin/activity", icon: Activity },
];

export function UIShell() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

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
          <Header aria-label="Club Portal">
            <SkipToContent />
            <HeaderMenuButton
              aria-label={isSideNavExpanded ? "Close menu" : "Open menu"}
              onClick={onClickSideNavExpand}
              isActive={isSideNavExpanded}
            />
            <HeaderName as={Link} to="/admin" prefix="CP">
              Club Portal
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
                {navItems.map((item) => {
                  const isActive = item.end
                    ? location.pathname === item.to
                    : location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  return (
                    <SideNavLink
                      key={item.to}
                      as={Link}
                      to={item.to}
                      renderIcon={item.icon}
                      isActive={isActive}
                      onClick={onClickSideNavExpand}
                    >
                      {item.label}
                    </SideNavLink>
                  );
                })}
                <SideNavLink
                  as={Link}
                  to="/admin/settings"
                  renderIcon={Settings}
                  isActive={location.pathname === "/admin/settings"}
                  onClick={onClickSideNavExpand}
                >
                  Settings
                </SideNavLink>
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
