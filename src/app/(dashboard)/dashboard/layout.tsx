"use client";

import AppSidebar from "@/components/sidebarDesign/AppSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ReactNode, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import SiteContextProvider, { useSiteContext } from "./siteContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AuthProvider } from "@/components/utils/supabase/AuthProvider";
import { LoadingAnimation, NoSiteSelected } from "@/components/theme";

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
    }, 5000);

    return () => clearTimeout(timeout);
  }, [selectedSite, router]);

  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center bg-primary-foreground dark:bg-secondary-background gap-2 border-b">
          <div className="flex items-center gap-1 px-3">
            <SidebarTrigger className="ring-0 focus-within:ring-0 border-0" />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 dark:bg-background bg-background">
          {selectedSite !== undefined || selectedSite !== null ? (
            <>
              {children}
              <Toaster />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[80vh] text-center px-4">
              <LoadingAnimation />
            </div>
          )}
        </main>
      </SidebarInset>
    </>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense>
      <AuthProvider>
        <SidebarProvider>
          <SiteContextProvider>
            <LayoutContent>{children}</LayoutContent>
          </SiteContextProvider>
        </SidebarProvider>
      </AuthProvider>
    </Suspense>
  );
}
