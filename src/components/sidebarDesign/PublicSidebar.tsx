"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SpeedySiteLogo } from "@/components/theme/logo";
import { useTheme } from "@/components/theme/ThemeProvider";

/**
 * Minimal sidebar for non-authenticated users.
 * No navigation, no site selector - just the logo.
 * Renders instantly with zero async dependencies.
 */

export default function PublicSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="dark:border-muted z-100 bg-muted-foreground"
    >
      <SidebarHeader className="mb-5 mt-2">
        <div className="flex gap-4 items-center">
          <div className="px-2">
            <SpeedySiteLogo isDark={isDark} />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="p-2 text-center text-muted-foreground/20 text-sm">
          Sign in to access dashboard
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
