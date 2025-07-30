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
import { useUser, Protect } from "@clerk/nextjs";
import DashboardToolbar from "@/components/utils/toolbar";
import { Toaster } from "@/components/ui/sonner";
import SiteContextProvider, { useSiteContext } from "./siteContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { PlanValidation } from "@/components/utils/activePlanValidation";
import { LoadingAnimation } from "@/components/utils/loadingAnimation";

interface DashboardLayoutProps {
  children: ReactNode;
}

function Fallback() {
  return (
    <div className="flex flex-col items-center justify-center md:mt-[-150px] min-h-screen p-6">
      <span className="text-4xl mb-4">🔒</span>
      <h2 className="text-[16px] font-normal text-center text-primary">
        You need at least the pro plan to view real user monitoring report.
      </h2>
      <p>
        Please visit <strong>account</strong> {">"} <strong>billing</strong> to
        check your active plan.
      </p>
    </div>
  );
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { user, isSignedIn } = useUser();
  const { fetchOrders, selectedSite } = useSiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  PlanValidation(); // optional client-side redirect if needed

  useEffect(() => {
    if (!user || !isSignedIn) return;
    fetchOrders(
      new URLSearchParams(window.location.search).get("site") || undefined
    );
  }, [user, isSignedIn, fetchOrders]);

  useEffect(() => {
    if (selectedSite) {
      const currentPath = pathname;
      const params = new URLSearchParams(searchParams.toString());
      params.set("site", selectedSite);
      router.replace(`${currentPath}?${params.toString()}`);
    }
  }, [selectedSite, pathname, router, searchParams]);

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
        <Suspense fallback={<LoadingAnimation />}>
          <Protect plan="pro" fallback={<Fallback />}>
            <LayoutContent>{children}</LayoutContent>
          </Protect>
        </Suspense>
      </SiteContextProvider>
    </SidebarProvider>
  );
}
