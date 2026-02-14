"use client";

import { ThemeToggle } from "../theme/ThemeToggle";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";

export default function SidebarInsetHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center bg-primary-foreground dark:bg-secondary-background gap-2 border-b">
      <div className="flex items-center gap-1 px-3">
        <SidebarTrigger className="ring-0 focus-within:ring-0 border-0" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <ThemeToggle />
      </div>
    </header>
  );
}
