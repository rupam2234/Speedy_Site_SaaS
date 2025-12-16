"use client";

import AppSidebar from "@/components/sidebarDesign/AppSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { ReactNode, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import SiteContextProvider, { useSiteContext } from "./siteContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AuthProvider } from "@/components/utils/supabase/AuthProvider";

interface DashboardLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { selectedSite } = useSiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!selectedSite) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("site", selectedSite);
    const currentUrl = `${pathname}?${params.toString()}`;
    if (currentUrl !== window.location.pathname + window.location.search) {
      router.replace(currentUrl);
    }
  }, [selectedSite, pathname, searchParams, router]);

  // Redirect back to dashboard if no site is selected
  useEffect(() => {
    if (selectedSite) return;

    const timeout = setTimeout(() => {
      router.push("/dashboard");
    }, 4000);

    return () => clearTimeout(timeout);
  }, [selectedSite, router]);

  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center bg-primary-foreground dark:bg-secondary-background gap-2 border-b">
          <div className="flex items-center gap-1 px-3">
            <SidebarTrigger className="ring-0 focus-within:ring-0 border-0" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 dark:bg-background bg-background">
          {children}
          <Toaster />
        </main>
      </SidebarInset>
    </>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AuthProvider>
        <SiteContextProvider>
          <LayoutContent>{children}</LayoutContent>
        </SiteContextProvider>
      </AuthProvider>
    </SidebarProvider>
  );
}
