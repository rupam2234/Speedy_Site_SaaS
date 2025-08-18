"use client";

import AppSidebar from "@/components/sidebarDesign/AppSidebar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@radix-ui/react-separator";
import { ReactNode, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";
import { AuthProvider } from "@/components/utils/supabase/AuthProvider";

interface DashboardLayoutProps {
  children: ReactNode;
}

function AccountLayout({ children }: { children: ReactNode }) {
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
        {/* <SiteContextProvider> */}
        <Suspense fallback={<LoadingAnimation />}>
          <AccountLayout>{children}</AccountLayout>
        </Suspense>
        {/* </SiteContextProvider> */}
      </AuthProvider>
    </SidebarProvider>
  );
}
