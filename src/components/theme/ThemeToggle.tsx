"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      className="bg-gray-100 absolute top-4.5 right-5 dark:bg-gray-800 dark:border-primary/50 text-sm px-3 py-1 rounded-full hover:opacity-80 transition border cursor-pointer"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
