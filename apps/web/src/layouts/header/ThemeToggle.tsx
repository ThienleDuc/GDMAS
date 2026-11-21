import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme.ts";

/** Nút SVG đổi Light ⇄ Dark — nằm sau đồng hồ realtime ở header bên phải. */
export const ThemeToggle: React.FC = () => {
  const { mode, toggle } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      className="header-theme-toggle"
      onClick={toggle}
      aria-label={isDark ? "Chuyển sang Light Mode" : "Chuyển sang Dark Mode"}
      aria-pressed={isDark}
      title={isDark ? "Light Mode" : "Dark Mode"}
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  );
};
