import { Menu, Close, Search } from "@carbon/icons-react";
import { HeaderAction } from "./HeaderAction";
import { CarbonIcon } from "../CarbonIcon";
import { ThemeToggle } from "../ThemeToggle";
import { RoleSwitcher } from "../RoleSwitcher";
import { useAuth } from "../../context/AuthContext";
import { useState } from "react";

interface HeaderProps {
  onMenuClick: () => void;
  isSideNavOpen: boolean;
}

export function Header({ onMenuClick, isSideNavOpen }: HeaderProps) {
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center border-b border-border-subtle bg-surface lg:left-64">
      <button
        type="button"
        className="flex h-12 w-12 items-center justify-center text-text-secondary hover:bg-surface-hover hover:text-text-primary lg:hidden"
        aria-label={isSideNavOpen ? "Close navigation" : "Open navigation"}
        onClick={onMenuClick}
      >
        {isSideNavOpen ? <Close size={20} /> : <Menu size={20} />}
      </button>

      <div className="flex flex-1 items-center justify-end gap-1 px-4">
        {searchOpen ? (
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Search..."
              className="h-8 w-48 border-b border-border-subtle bg-transparent px-2 text-sm text-text-primary placeholder-text-placeholder outline-none focus:border-border-interactive"
              autoFocus
              onBlur={() => setSearchOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearchOpen(false);
              }}
            />
          </div>
        ) : (
          <HeaderAction label="Search" onClick={() => setSearchOpen(true)}>
            <Search size={20} />
          </HeaderAction>
        )}

        <ThemeToggle />
        <RoleSwitcher />

        <div className="ml-2 flex items-center gap-2 pl-2">
          <span className="hidden text-sm text-text-secondary sm:block">
            {user?.name}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-carbon-blue-60 text-sm font-semibold text-white">
            {user?.name
              ?.split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2) || "?"}
          </div>
        </div>
      </div>
    </header>
  );
}
