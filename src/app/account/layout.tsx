"use client";

import AppSidebar from "@/components/sidebarDesign/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ReactNode, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { LoadingAnimation } from "@/components/theme/loadingAnimation";
import SidebarInsetHeader from "@/components/sidebarDesign/Inset-Header";

interface DashboardLayoutProps {
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

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <Suspense fallback={<LoadingAnimation />}>
        <AccountLayout>{children}</AccountLayout>
      </Suspense>
    </SidebarProvider>
  );
}
