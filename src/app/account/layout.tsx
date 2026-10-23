"use client";

import AppSidebar from "@/components/sidebarDesign/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ReactNode, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { LoadingAnimation } from "@/components/theme/loadingAnimation";
import SidebarInsetHeader from "@/components/sidebarDesign/Inset-Header";
import { AuthProvider } from "@/components/utils/supabase/AuthProvider";
import SiteContextProvider from "@/app/(dashboard)/dashboard/siteContext";

interface AccountLayoutProps {
  children: ReactNode;
}

function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <SidebarInsetHeader />
        <main className="flex-1 dark:bg-background bg-background">
          {children}
          <Toaster />
        </main>
      </SidebarInset>
    </>
  );
}

export default function DashboardLayout({ children }: AccountLayoutProps) {
  return (
    <Suspense fallback={<LoadingAnimation />}>
      <AuthProvider>
        <SidebarProvider>
          <SiteContextProvider>
            <AccountLayout>{children}</AccountLayout>
          </SiteContextProvider>
        </SidebarProvider>
      </AuthProvider>
    </Suspense>
  );
}
