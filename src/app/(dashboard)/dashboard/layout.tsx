"use client";

import AppSidebar from "@/components/sidebarDesign/AppSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { ReactNode, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import SiteContextProvider, { useSiteContext } from "./siteContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AuthProvider } from "@/components/utils/supabase/AuthProvider";
// import { LoadingAnimation } from "@/components/utils/loadingAnimation";

interface DashboardLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { selectedSite } = useSiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Update the `site` query param in the URL
  useEffect(() => {
    if (selectedSite) {
      const currentPath = pathname;
      const params = new URLSearchParams(searchParams.toString());
      params.set("site", selectedSite);
      router.replace(`${currentPath}?${params.toString()}`);
    }
  }, [selectedSite, pathname, router, searchParams]);

  // Redirect back to dashboard if no site is selected
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!selectedSite) {
        router.push("/dashboard");
      }
    }, 500);
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
          <Suspense>
            <LayoutContent>{children}</LayoutContent>
          </Suspense>
        </SiteContextProvider>
      </AuthProvider>
    </SidebarProvider>
  );
}
