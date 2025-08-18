"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="bg-gray-100 absolute top-[18px] right-5 dark:bg-gray-800 text-sm px-3 py-1 rounded-full hover:opacity-80 transition border dark:border-gray-700"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
