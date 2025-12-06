"use client";

import AppSidebar from "@/components/sidebarDesign/AppSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { ReactNode, useRef, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import SiteContextProvider, { useSiteContext } from "./siteContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AuthProvider } from "@/components/utils/supabase/AuthProvider";

interface DashboardLayoutProps {
  children: ReactNode;
}

function useUpdateSiteQuery() {
  const { selectedSite } = useSiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!selectedSite) return;
    if (ranRef.current) return; // prevent double-run in dev
    ranRef.current = true;

    const params = new URLSearchParams(searchParams.toString());
    params.set("site", selectedSite);
    router.replace(`${pathname}?${params.toString()}`);
  }, [selectedSite, pathname, searchParams, router]);
}

// Redirect back to dashboard if no site selected
function useRedirectIfNoSite() {
  const { selectedSite } = useSiteContext();
  const router = useRouter();
  const ranRef = useRef(false);

  useEffect(() => {
    if (selectedSite) return;
    if (ranRef.current) return;
    ranRef.current = true;

    const timeout = setTimeout(() => {
      router.push("/dashboard");
    }, 4000);

    return () => clearTimeout(timeout);
  }, [selectedSite, router]);
}

function LayoutContent({ children }: { children: ReactNode }) {
  useUpdateSiteQuery();
  useRedirectIfNoSite();

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

// -------------------- Dashboard Layout --------------------

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
