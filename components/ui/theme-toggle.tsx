"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  isCollapsed: boolean;
}

export function ThemeToggle({ isCollapsed }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <button
      onClick={toggle}
      className={cn(
        "flex items-center gap-x-3 text-sm px-3 py-2.5 rounded-lg transition-colors duration-150 relative group w-full",
        "text-muted-foreground hover:text-foreground",
        isCollapsed ? "justify-center px-2" : ""
      )}
    >
      <div className="absolute inset-0 rounded-lg transition-colors bg-transparent group-hover:bg-accent" />
      <Sun className="h-[18px] w-[18px] relative z-10 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="h-[18px] w-[18px] absolute left-3 z-10 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      {!isCollapsed && <span className="relative z-10">Theme</span>}
    </button>
  );
}
