"use client";

import AppSidebar from "@/components/sidebarDesign/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ReactNode, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import SiteContextProvider, { useSiteContext } from "./siteContext";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  AuthProvider,
  useSupabaseUser,
} from "@/components/utils/supabase/AuthProvider";
import { LoadingAnimation } from "@/components/theme";
import SidebarInsetHeader from "@/components/sidebarDesign/Inset-Header";
import { validatePlan } from "@/components/utils/planValidation/activePlan";

interface DashboardLayoutProps {
  children: ReactNode;
}

function LayoutContent({ children }: { children: ReactNode }) {
  const { selectedSite, plan, setPlan } = useSiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSupabaseUser();

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

  // set active plan
  useEffect(() => {
    if (!user?.id || plan !== null) return; // plan already fetched

    const fetchAndSetPlan = async () => {
      try {
        const activePlan: any = await validatePlan(user.id);
        const planValue = activePlan?.[0]?.plan ?? "Free";
        setPlan(planValue);
      } catch (err) {
        console.error("Failed to fetch plan:", err);
        setPlan("Free");
      }
    };

    fetchAndSetPlan();
  }, [user?.id, plan, setPlan]);

  return (
    <>
      <AppSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <SidebarInsetHeader />
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
