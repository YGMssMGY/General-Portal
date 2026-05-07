import { SideNavItem } from "./SideNavItem";

const adminNavItems = [
  { label: "Dashboard", to: "/admin", icon: "Dashboard" as const, end: true },
  { label: "Proposals", to: "/admin/proposals", icon: "Document" as const },
  { label: "Tasks", to: "/admin/tasks", icon: "Task" as const },
  { label: "Events", to: "/admin/events", icon: "Calendar" as const },
  { label: "Volunteers", to: "/admin/volunteers", icon: "User" as const },
  { label: "Finance", to: "/admin/finance", icon: "Money" as const },
  { label: "Messages", to: "/admin/messages", icon: "Chat" as const },
  { label: "Files", to: "/admin/files", icon: "Folder" as const },
  { label: "Members", to: "/admin/members", icon: "Group" as const },
  { label: "Search", to: "/admin/search", icon: "Search" as const },
  { label: "Activity", to: "/admin/activity", icon: "Activity" as const },
];

interface SideNavProps {
  isOpen: boolean;
  onNavigate: () => void;
}

export function SideNav({ isOpen, onNavigate }: SideNavProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border-subtle bg-surface transition-transform lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-12 items-center gap-3 border-b border-border-subtle px-4">
        <div className="flex h-8 w-8 items-center justify-center bg-carbon-blue-60 text-sm font-semibold text-white">
          CP
        </div>
        <div>
          <p className="text-sm font-semibold text-text-primary leading-tight">Club Portal</p>
          <p className="text-xs text-text-secondary">Workspace</p>
        </div>
      </div>

      <nav className="scrollbar-soft flex-1 overflow-y-auto py-2">
        {adminNavItems.map((item) => (
          <SideNavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            end={item.end}
            onClick={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-border-subtle py-2">
        <SideNavItem to="/admin/settings" icon="Settings" label="Settings" onClick={onNavigate} />
        <SideNavItem to="/" icon="Launch" label="Public Site" onClick={onNavigate} />
      </div>
    </aside>
  );
}
