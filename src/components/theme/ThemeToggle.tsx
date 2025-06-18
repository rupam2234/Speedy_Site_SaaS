"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div
      className="absolute top-3 right-3 p-1 rounded-2xl transition-colors cursor-pointer"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === "Enter" || e.key === " ") toggleTheme();
      }}
    >
      {theme === "light" ? (
        <Moon
          className="h-6 w-6 text-primary p-[1px] rounded-full transition-colors duration-300
                     hover:bg-gray-200 hover:scale-110 hover:text-primary/80"
        />
      ) : (
        <Sun
          className="h-6 w-6 text-accent-foreground dark:text-muted-foreground transition-colors duration-300
                     hover:scale-110 hover:text-accent-foreground/80"
        />
      )}
    </div>
  );
}
