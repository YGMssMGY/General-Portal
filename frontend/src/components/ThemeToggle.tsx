import { useTheme } from "../context/ThemeContext";
import { Asleep, Light } from "@carbon/icons-react";
import { HeaderGlobalAction } from "@carbon/react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <HeaderGlobalAction
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <Light size={20} /> : <Asleep size={20} />}
    </HeaderGlobalAction>
  );
}
