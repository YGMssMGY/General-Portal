import { useMemo, useState, useRef, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { PageTransition } from "../PageTransition/PageTransition";
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
import { getClientConfig, type ClientConfig } from "../../config/clientConfig";
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
	Logout,
	Notification,
} from "@carbon/icons-react";
import { useSession, signOut } from "@hono/auth-js/react";
import { useTheme } from "../../context/ThemeContext";
import { useNotifications } from "../../hooks/useNotifications";
import { useKeyboardShortcuts } from "../../hooks/useKeyboardShortcuts";
import { useUIStore } from "../../stores/useUIStore";
import { formatDate } from "../../utils/format";
import type { ComponentType, ElementType } from "react";

interface NavItem {
	label: string;
	to: string;
	icon: ComponentType<any>;
	end?: boolean;
	minRole?: string;
	featureFlag?: keyof ClientConfig["features"];
}

interface NavGroup {
	title: string;
	items: NavItem[];
}

function getNavConfig(portal: string): NavGroup[] {
	const p = portal || "developers";
	return [
		{
			title: "Main",
			items: [
				{ label: "Dashboard", to: `/${p}/dashboard`, icon: Dashboard, end: true },
				{ label: "Search", to: `/${p}/search`, icon: Search },
			],
		},
		{
			title: "Management",
			items: [
				{ label: "Tasks", to: `/${p}/tasks`, icon: Task },
				{ label: "Events", to: `/${p}/events`, icon: Calendar },
				{
					label: "Proposals",
					to: `/${p}/proposals`,
					icon: Document,
					featureFlag: "showProposals",
				},
				{
					label: "Volunteers",
					to: `/${p}/volunteers`,
					icon: User,
					featureFlag: "showVolunteers",
				},
				{
					label: "Finance",
					to: `/${p}/finance`,
					icon: Money,
					minRole: "officer",
					featureFlag: "showFinance",
				},
				{ label: "Files", to: `/${p}/files`, icon: Folder, featureFlag: "showFiles" },
				{
					label: "Meetings",
					to: `/${p}/meetings`,
					icon: Calendar,
					featureFlag: "showMeetings",
				},
			],
		},
		{
			title: "Communication",
			items: [{ label: "Messages", to: `/${p}/messages`, icon: Chat }],
		},
		{
			title: "Administration",
			items: [
				{ label: "Accounts", to: `/${p}/accounts`, icon: User },
				{
					label: "Members",
					to: `/${p}/members`,
					icon: Group,
					minRole: "officer",
					featureFlag: "showMembers",
				},
				{
					label: "Activity",
					to: `/${p}/activity`,
					icon: Activity,
					minRole: "officer",
					featureFlag: "showActivity",
				},
				{
					label: "Settings",
					to: `/${p}/settings`,
					icon: Settings,
					minRole: "president",
					featureFlag: "showSettings",
				},
			],
		},
	];
}

const roleLevels: Record<string, number> = {
	admin: 4,
	president: 3,
	officer: 2,
	member: 1,
};

export function UIShell() {
	const { theme, toggleTheme } = useTheme();
	const { data: session } = useSession();
	const sessionUser = session?.user as any;
	const location = useLocation();
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const [notifOpen, setNotifOpen] = useState(false);
	const notifRef = useRef<HTMLDivElement>(null);
	const notifBtnRef = useRef<HTMLButtonElement>(null);
	const { unreadCount, notifications, markRead, markAllRead } = useNotifications();
	const portal = useUIStore((s) => s.portal) || "developers";
	const setPortal = useUIStore((s) => s.setPortal);
	const config = useMemo(() => getClientConfig(portal ?? undefined), [portal]);
	const features = config.features;

	useKeyboardShortcuts({
		"ctrl+k": () => {
			setSearchOpen((prev) => !prev);
		},
	});

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (
				notifOpen &&
				notifRef.current &&
				!notifRef.current.contains(e.target as Node) &&
				notifBtnRef.current &&
				!notifBtnRef.current.contains(e.target as Node)
			) {
				setNotifOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [notifOpen]);

	const userRoleLevel = useMemo(() => {
		const role = sessionUser?.role;
		return role ? roleLevels[role] || 1 : 1;
	}, [sessionUser?.role]);

	const filteredConfig = useMemo(() => {
		return getNavConfig(portal)
			.map((group) => ({
				...group,
				items: group.items.filter((item) => {
					if (item.featureFlag && !features[item.featureFlag]) return false;
					if (!item.minRole) return true;
					return userRoleLevel >= (roleLevels[item.minRole] || 0);
				}),
			}))
			.filter((group) => group.items.length > 0);
	}, [userRoleLevel, features, portal]);

	function handleSearchSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === "Enter" && searchValue.trim()) {
			window.location.href = `/${portal}/search?q=${encodeURIComponent(searchValue.trim())}`;
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
				<div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
					<a href="#main-content" className="skip-to-content">
						Skip to main content
					</a>
					<Header aria-label={config.displayName}>
						<SkipToContent />
						<HeaderMenuButton
							aria-label={isSideNavExpanded ? "Close menu" : "Open menu"}
							onClick={onClickSideNavExpand}
							isActive={isSideNavExpanded}
						/>
						<HeaderName as={Link} to={`/${portal}/dashboard`} prefix={config.shortName}>
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
								<HeaderGlobalAction
									aria-label="Search"
									onClick={() => setSearchOpen(true)}
								>
									<Search size={20} />
								</HeaderGlobalAction>
							)}
							<HeaderGlobalAction
								aria-label="Dev Docs"
								onClick={() => window.open("/api/docs", "_blank")}
							>
								<Launch size={20} />
							</HeaderGlobalAction>
							<div style={{ position: "relative" }}>
								<HeaderGlobalAction
									ref={notifBtnRef}
									aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
									onClick={() => setNotifOpen((prev) => !prev)}
								>
									<Notification size={20} />
									{unreadCount > 0 && (
										<span
											style={{
												position: "absolute",
												top: "4px",
												right: "4px",
												minWidth: "16px",
												height: "16px",
												borderRadius: "8px",
												background: "var(--cds-support-error, #da1e28)",
												color: "#fff",
												fontSize: "10px",
												fontWeight: 700,
												lineHeight: "16px",
												textAlign: "center",
												padding: "0 4px",
												pointerEvents: "none",
											}}
										>
											{unreadCount > 99 ? "99+" : unreadCount}
										</span>
									)}
								</HeaderGlobalAction>
								{notifOpen && (
									<div
										ref={notifRef}
										style={{
											position: "absolute",
											top: "100%",
											right: 0,
											width: "320px",
											maxHeight: "400px",
											overflowY: "auto",
											background: "var(--cds-layer-01, #fff)",
											border: "1px solid var(--cds-border-subtle-01, #e0e0e0)",
											borderRadius: "4px",
											boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
											zIndex: 9000,
										}}
									>
										<div
											style={{
												padding: "0.75rem 1rem",
												borderBottom:
													"1px solid var(--cds-border-subtle-01, #e0e0e0)",
											}}
										>
											<span
												style={{
													fontWeight: 600,
													fontSize: "0.875rem",
													color: "var(--cds-text-primary, #161616)",
												}}
											>
												Notifications
											</span>
										</div>
										{notifications.length === 0 ? (
											<div
												style={{
													padding: "1.5rem 1rem",
													textAlign: "center",
													fontSize: "0.875rem",
													color: "var(--cds-text-secondary, #6f6f6f)",
												}}
											>
												No notifications
											</div>
										) : (
											<>
												{notifications.slice(0, 20).map((n) => (
													<button
														key={n.id}
														type="button"
														onClick={() => markRead(n.id)}
														style={{
															display: "block",
															width: "100%",
															textAlign: "left",
															padding: "0.625rem 1rem",
															border: "none",
															borderBottom:
																"1px solid var(--cds-border-subtle-01, #e0e0e0)",
															cursor: "pointer",
															background: n.isRead
																? "transparent"
																: "var(--cds-layer-02, #f4f4f4)",
															color: "var(--cds-text-primary, #161616)",
															fontSize: "0.875rem",
														}}
													>
														<div
															style={{
																fontWeight: n.isRead ? 400 : 600,
															}}
														>
															{n.title}
														</div>
														{n.body && (
															<div
																style={{
																	fontSize: "0.75rem",
																	color: "var(--cds-text-secondary, #6f6f6f)",
																	marginTop: "2px",
																	overflow: "hidden",
																	textOverflow: "ellipsis",
																	whiteSpace: "nowrap",
																}}
															>
																{n.body}
															</div>
														)}
														<div
															style={{
																fontSize: "0.6875rem",
																color: "var(--cds-text-helper, #c6c6c6)",
																marginTop: "4px",
															}}
														>
															{formatDate(n.createdAt)}
														</div>
													</button>
												))}
												{unreadCount > 0 && (
													<button
														type="button"
														onClick={() => {
															markAllRead();
															setNotifOpen(false);
														}}
														style={{
															display: "block",
															width: "100%",
															padding: "0.625rem 1rem",
															border: "none",
															background: "transparent",
															cursor: "pointer",
															color: "var(--cds-link-primary, #0f62fe)",
															fontSize: "0.875rem",
															fontWeight: 500,
														}}
													>
														Mark all read
													</button>
												)}
											</>
										)}
									</div>
								)}
							</div>
							<Link
								to={`/${portal}/accounts`}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "0.375rem",
									padding: "0 0.5rem",
									height: "3rem",
									textDecoration: "none",
									color: "inherit",
								}}
								aria-label="Account settings"
							>
								<span
									style={{
										width: "0.5rem",
										height: "0.5rem",
										borderRadius: "50%",
										background: "#24a148",
										display: "inline-block",
										flexShrink: 0,
									}}
								/>
								<span
									style={{
										width: "1.5rem",
										height: "1.5rem",
										borderRadius: "50%",
										background: "var(--cds-button-tertiary)",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										color: "#fff",
										fontSize: "0.6875rem",
										fontWeight: 600,
										cursor: "pointer",
									}}
								>
									{(sessionUser?.name ?? "?").charAt(0).toUpperCase()}
								</span>
							</Link>
							<HeaderGlobalAction
								aria-label={
									theme === "dark"
										? "Switch to light mode"
										: "Switch to dark mode"
								}
								onClick={toggleTheme}
							>
								{theme === "dark" ? <Light size={20} /> : <Asleep size={20} />}
							</HeaderGlobalAction>
							<HeaderGlobalAction
								aria-label="Switch portal"
								onClick={() => {
									setPortal(null);
									window.location.href = "/";
								}}
							>
								<span style={{ fontSize: "1rem", fontWeight: 700 }}>&#x21C4;</span>
							</HeaderGlobalAction>
							<HeaderGlobalAction
								aria-label="Sign out"
								onClick={() => signOut({ redirect: true, callbackUrl: "/" })}
							>
								<Logout size={20} />
							</HeaderGlobalAction>
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
								<SideNavLink
									as={Link}
									to="/"
									renderIcon={Launch}
									onClick={onClickSideNavExpand}
								>
									Public Site
								</SideNavLink>
							</SideNavItems>
						</SideNav>
					</Header>
					<Content
						id="main-content"
						style={{ flex: 1, display: "flex", flexDirection: "column" }}
					>
						<PageTransition>
							<Outlet />
						</PageTransition>
					</Content>
				</div>
			)}
		/>
	);
}
