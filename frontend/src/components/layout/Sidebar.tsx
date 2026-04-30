import {
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  Files,
  Folder,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Users,
  WalletCards
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useWorkspace } from "../../context/WorkspaceContext";

const navigation = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Proposals", to: "/proposals", icon: Files },
  { label: "Tasks", to: "/tasks", icon: ClipboardList },
  { label: "Events", to: "/events", icon: CalendarDays },
  { label: "Volunteers", to: "/volunteers", icon: Users },
  { label: "Finance", to: "/finance", icon: WalletCards },
  { label: "Messages", to: "/messages", icon: MessageSquare },
  { label: "Files", to: "/files", icon: Folder },
  { label: "Members", to: "/members", icon: BadgeCheck },
  { label: "Search", to: "/search", icon: Search }
];

export function Sidebar({ isOpen, onNavigate }: { isOpen: boolean; onNavigate: () => void }) {
  const { workspace } = useWorkspace();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-sidebar-width flex-col border-r border-slate-200 bg-white transition-transform md:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-topbar-height items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant bg-primary text-sm font-bold text-on-primary">
          OF
        </div>
        <div>
          <p className="font-display text-lg font-bold leading-6 text-slate-950">{workspace.name}</p>
          <p className="text-xs font-medium text-slate-500">Switch Workspace</p>
        </div>
      </div>

      <nav className="scrollbar-soft flex-1 overflow-y-auto py-4 text-sm font-medium">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-[3px] px-5 py-3 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`
              }
              end={item.to === "/"}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 py-2">
        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 border-l-[3px] px-5 py-3 text-sm font-medium transition-colors ${
              isActive ? "border-primary text-primary" : "border-transparent text-slate-500 hover:bg-slate-50"
            }`
          }
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}
