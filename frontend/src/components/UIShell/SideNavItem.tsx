import { NavLink } from "react-router-dom";
import { CarbonIcon, type CarbonIconName } from "../CarbonIcon";

interface SideNavItemProps {
  to: string;
  icon: CarbonIconName;
  label: string;
  end?: boolean;
  onClick?: () => void;
}

export function SideNavItem({ to, icon, label, end, onClick }: SideNavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 text-sm font-normal transition-colors border-l-[3px] ${
          isActive
            ? "border-border-interactive bg-surface-selected text-text-primary"
            : "border-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        }`
      }
    >
      <CarbonIcon name={icon} size={20} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}
