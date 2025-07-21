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
import { useUser } from "@clerk/nextjs";
import DashboardToolbar from "@/components/utils/toolbar";

import { Toaster } from "@/components/ui/sonner";
import SiteContextProvider, { useSiteContext } from "./siteContext";

interface DashboardLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { user, isSignedIn } = useUser();
  const { fetchOrders } = useSiteContext();

  useEffect(() => {
    if (!user || !isSignedIn) return;

    fetchOrders(
      new URLSearchParams(window.location.search).get("site") || undefined
    );
  }, [user, isSignedIn, fetchOrders]);

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
          <DashboardToolbar />
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
      <SiteContextProvider>
        <LayoutContent>{children}</LayoutContent>
      </SiteContextProvider>
    </SidebarProvider>
  );
}
